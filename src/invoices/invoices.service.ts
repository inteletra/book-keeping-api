import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice } from './entities/invoice.entity';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoicePayment } from './entities/invoice-payment.entity';
import { Account } from '../accounts/entities/account.entity';
import { LedgerSourceType, InvoiceStatus } from '@bookkeeping/shared';
import { User } from '../users/entities/user.entity';
import { LedgerService } from '../ledger/ledger.service';
import { AuditService } from '../audit/audit.service';
import * as fs from 'fs';
import csv from 'csv-parser';

@Injectable()
export class InvoicesService {
    constructor(
        @InjectRepository(Invoice)
        private invoicesRepository: Repository<Invoice>,
        @InjectRepository(InvoicePayment)
        private invoicePaymentsRepository: Repository<InvoicePayment>,
        @InjectRepository(Account)
        private accountsRepository: Repository<Account>,
        private ledgerService: LedgerService,
        private auditService: AuditService,
    ) { }

    async create(createInvoiceDto: CreateInvoiceDto, user: User): Promise<Invoice> {
        console.log('Creating invoice with DTO:', createInvoiceDto);
        const { items, ...invoiceData } = createInvoiceDto;

        try {
            const invoice = this.invoicesRepository.create({
                ...invoiceData,
                customerName: createInvoiceDto.customerName || 'Unknown Client',
                company: user.company,
                status: createInvoiceDto.status || InvoiceStatus.DRAFT,
                items: items.map((item) => ({
                    ...item,
                    amount: item.quantity * item.unitPrice,
                    taxAmount: (item.quantity * item.unitPrice) * (item.taxRate / 100),
                })),
            });
            console.log('Invoice entity created:', invoice);

            // Calculate totals
            invoice.subtotal = invoice.items.reduce((sum, item) => sum + item.amount, 0);
            invoice.taxTotal = invoice.items.reduce((sum, item) => sum + item.taxAmount, 0);
            invoice.total = invoice.subtotal + invoice.taxTotal;

            // Generate invoice number
            const count = await this.invoicesRepository.count({
                where: { company: { id: user.company.id } },
            });
            invoice.invoiceNumber = `INV-${(count + 1).toString().padStart(3, '0')}`;
            console.log('Invoice number generated:', invoice.invoiceNumber);

            const savedInvoice = await this.invoicesRepository.save(invoice);
            console.log('Invoice saved successfully:', savedInvoice);

            // Audit log
            await this.auditService.log(
                'CREATE',
                'Invoice',
                savedInvoice.id,
                user.id,
                { invoiceNumber: savedInvoice.invoiceNumber, total: savedInvoice.total }
            );

            return savedInvoice;
        } catch (error) {
            console.error('Error creating invoice:', error);
            throw error;
        }
    }

    async importFromCSV(
        file: Express.Multer.File,
        user: User,
    ): Promise<{ created: number; failed: number; errors: string[] }> {
        const results: any[] = [];
        const errors: string[] = [];

        return new Promise((resolve) => {
            fs.createReadStream(file.path)
                .pipe(csv())
                .on('data', (row: any) => results.push(row))
                .on('end', async () => {
                    let created = 0;
                    let failed = 0;

                    for (const row of results) {
                        try {
                            const invoice = this.invoicesRepository.create({
                                invoiceNumber: row['Invoice Number'] || row['invoiceNumber'],
                                clientName: row['Client Name'] || row['clientName'],
                                date: new Date(row['Date'] || row['date']),
                                dueDate: new Date(row['Due Date'] || row['dueDate']),
                                subtotal: parseFloat(row['Amount'] || row['amount'] || '0'),
                                taxTotal: parseFloat(row['VAT'] || row['vat'] || '0'),
                                total: parseFloat(row['Total'] || row['total'] || '0'),
                                status: (row['Status'] || row['status'] || 'PENDING') as InvoiceStatus,
                                company: user.company,
                                items: [],
                            } as any);

                            await this.invoicesRepository.save(invoice);
                            created++;
                        } catch (error: any) {
                            failed++;
                            errors.push(`Row ${results.indexOf(row) + 2}: ${error.message}`);
                        }
                    }

                    // Clean up uploaded file
                    fs.unlinkSync(file.path);

                    resolve({ created, failed, errors: errors.slice(0, 10) }); // Limit errors to 10
                });
        });
    }

    async findAll(pagination: any = {}, user: User): Promise<any> {
        const { page, limit, sortBy = 'createdAt', sortOrder = 'DESC' } = pagination;

        // If no pagination params, return all (backward compatible)
        if (!page && !limit) {
            return this.invoicesRepository.find({
                where: { company: { id: user.company.id } },
                relations: ['items'],
                order: { [sortBy]: sortOrder },
            });
        }

        // With pagination
        const skip = ((page || 1) - 1) * (limit || 10);
        const take = limit || 10;

        const [data, total] = await this.invoicesRepository.findAndCount({
            where: { company: { id: user.company.id } },
            relations: ['items'],
            order: { [sortBy]: sortOrder },
            skip,
            take,
        });

        return {
            data,
            meta: {
                total,
                page: page || 1,
                limit: limit || 10,
                totalPages: Math.ceil(total / (limit || 10)),
            },
        };
    }

    async findOne(id: string, user: User): Promise<Invoice> {
        const invoice = await this.invoicesRepository.findOne({
            where: { id, company: { id: user.company.id } },
            relations: ['items'],
        });
        if (!invoice) {
            throw new NotFoundException(`Invoice #${id} not found`);
        }
        return invoice;
    }

    async update(
        id: string,
        updateInvoiceDto: UpdateInvoiceDto,
        user: User,
    ): Promise<Invoice> {
        const invoice = await this.findOne(id, user);
        Object.assign(invoice, updateInvoiceDto);
        return this.invoicesRepository.save(invoice);
    }

    async remove(id: string, user: User): Promise<void> {
        const invoice = await this.findOne(id, user);
        await this.invoicesRepository.remove(invoice);
    }

    async markAsPaid(id: string, user: User): Promise<Invoice> {
        const invoice = await this.findOne(id, user);

        if (invoice.status === InvoiceStatus.PAID) {
            throw new BadRequestException('Invoice is already paid');
        }

        invoice.status = InvoiceStatus.PAID;
        await this.invoicesRepository.save(invoice);

        // Post to ledger
        await this.ledgerService.postInvoiceToLedger(invoice, user);

        return invoice;
    }
    async recordPayment(
        id: string,
        amount: number,
        dateString: string,
        method: string,
        accountId: string,
        reference: string,
        user: User
    ): Promise<Invoice> {
        try {
            const date = new Date(dateString);
            console.log('Step 1: Recording payment:', { id, amount, date, method, accountId, reference, userId: user.id });

            const invoice = await this.findOne(id, user);
            console.log('Step 2: Found invoice:', invoice.invoiceNumber);

            if (invoice.status === InvoiceStatus.PAID) {
                throw new BadRequestException('Invoice is already paid');
            }

            // Create payment record
            console.log('Step 3: Creating payment record...');
            const payment = this.invoicePaymentsRepository.create({
                amount,
                date,
                method,
                reference,
                invoiceId: invoice.id,
                accountId,
            });
            await this.invoicePaymentsRepository.save(payment);
            console.log('Step 4: Payment record saved');

            // Update invoice totals
            invoice.amountPaid = (Number(invoice.amountPaid) || 0) + Number(amount);
            invoice.balanceDue = Number(invoice.total) - invoice.amountPaid;

            // Update status
            if (invoice.balanceDue <= 0) {
                invoice.status = InvoiceStatus.PAID;
                invoice.balanceDue = 0;
            } else {
                invoice.status = InvoiceStatus.PARTIALLY_PAID;
            }

            console.log('Step 5: Saving invoice with new status:', invoice.status);
            await this.invoicesRepository.save(invoice);
            console.log('Step 6: Invoice saved successfully');

            // Post to Ledger (with error handling to not block payment recording)
            try {
                console.log('Step 7: Posting to ledger...');
                const arAccount = await this.accountsRepository.findOne({
                    where: { code: '1200', company: { id: user.company.id } }
                });

                if (!arAccount) {
                    console.error('AR account not found, skipping ledger posting');
                } else {
                    await this.ledgerService.createEntry({
                        date: date.toISOString(),
                        description: `Payment for Invoice #${invoice.invoiceNumber}`,
                        reference: reference || `PAY-${invoice.invoiceNumber}`,
                        sourceType: LedgerSourceType.INVOICE_PAYMENT,
                        sourceId: invoice.id,
                        entries: [
                            {
                                accountId: accountId,
                                debit: amount,
                                credit: 0,
                                description: `Payment for Invoice #${invoice.invoiceNumber}`,
                            },
                            {
                                accountId: arAccount.id,
                                debit: 0,
                                credit: amount,
                                description: `Payment for Invoice #${invoice.invoiceNumber}`,
                            }
                        ]
                    }, user);
                    console.log('Step 8: Ledger entry created successfully');
                }
            } catch (ledgerError) {
                console.error('Warning: Failed to post to ledger, but payment was recorded:', ledgerError.message);
                // Don't throw - payment is already recorded
            }

            console.log('Payment recorded successfully');
            return invoice;
        } catch (error) {
            console.error('Error recording payment at step:', error.message);
            console.error('Full error:', error);
            throw error;
        }
    }
}
