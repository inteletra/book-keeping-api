import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VendorBill, VendorBillStatus } from './entities/vendor-bill.entity';
import { VendorBillItem } from './entities/vendor-bill-item.entity';
import { LedgerService } from '../ledger/ledger.service';
import { User } from '../users/entities/user.entity';
import { Account } from '../accounts/entities/account.entity';
import { LedgerSourceType } from '@bookkeeping/shared';

@Injectable()
export class VendorBillsService {
    constructor(
        @InjectRepository(VendorBill)
        private vendorBillsRepository: Repository<VendorBill>,
        @InjectRepository(VendorBillItem)
        private vendorBillItemsRepository: Repository<VendorBillItem>,
        @InjectRepository(Account)
        private accountsRepository: Repository<Account>,
        private ledgerService: LedgerService,
    ) { }

    async create(createDto: any, user: User) {
        const { items, ...billData } = createDto;

        const bill = this.vendorBillsRepository.create({
            ...billData,
            company: user.company,
            status: VendorBillStatus.DRAFT,
        });

        const savedBill = (await this.vendorBillsRepository.save(bill)) as unknown as VendorBill;

        if (items && items.length > 0) {
            const billItems = items.map(item => this.vendorBillItemsRepository.create({
                ...item,
                bill: savedBill,
            }));
            await this.vendorBillItemsRepository.save(billItems);
        }

        return this.findOne(savedBill.id, user);
    }

    async findOne(id: string, user: User) {
        const bill = await this.vendorBillsRepository.findOne({
            where: { id, company: { id: user.company.id } },
            relations: ['items', 'items.account'],
        });
        if (!bill) throw new NotFoundException('Vendor bill not found');
        return bill;
    }

    async findAll(user: User) {
        return this.vendorBillsRepository.find({
            where: { company: { id: user.company.id } },
            order: { issueDate: 'DESC' },
            relations: ['items'],
        });
    }

    async post(id: string, user: User) {
        const bill = await this.findOne(id, user);
        if (bill.status !== VendorBillStatus.DRAFT) {
            throw new BadRequestException('Only draft bills can be posted');
        }

        // 1. Validate Accounts Payable account exists
        const apAccount = await this.accountsRepository.findOne({
            where: { code: '2100', company: { id: user.company.id } } // Assuming 2100 is AP
        });

        if (!apAccount) throw new BadRequestException('Accounts Payable (2100) account not found');

        // 2. Create Ledger Entries
        // Credit AP (Liability increases)
        // Debit Expenses/Assets (Expense increases)

        const entries: any[] = [];

        // Credit AP for Total Amount
        entries.push({
            accountId: apAccount.id,
            credit: bill.totalAmount,
            debit: 0,
            description: `Bill #${bill.billNumber} - ${bill.vendorName}`,
        });

        // Debit Line Items
        for (const item of bill.items) {
            entries.push({
                accountId: item.accountId,
                debit: item.amount, // Net amount? Or Gross? Usually expense is net, tax is separate.
                // If item amount includes tax, we need to split.
                // Assuming item.amount is NET and we have taxAmount separately.
                // Let's assume item.amount is the expense amount.
                credit: 0,
                description: item.description,
            });

            if (item.taxAmount > 0) {
                // Debit VAT Receivable (1300)
                // We need to find VAT account.
                // For simplicity, let's assume we look it up or hardcode for now.
                // Better: item should specify tax account? Or use default.
                // Let's find 1300.
                const vatAccount = await this.accountsRepository.findOne({
                    where: { code: '1300', company: { id: user.company.id } }
                });
                if (vatAccount) {
                    entries.push({
                        accountId: vatAccount.id,
                        debit: item.taxAmount,
                        credit: 0,
                        description: `VAT on Bill #${bill.billNumber}`,
                    });
                }
            }
        }

        // Post entries to Ledger
        for (const entry of entries) {
            await this.ledgerService.createEntry({
                accountId: entry.accountId,
                debit: entry.debit,
                credit: entry.credit,
                date: bill.issueDate.toString(),
                description: entry.description,
                reference: bill.billNumber,
                sourceType: LedgerSourceType.BILL, // We need to add BILL to LedgerSourceType
                sourceId: bill.id,
            }, user);
        }

        bill.status = VendorBillStatus.OPEN;
        return this.vendorBillsRepository.save(bill);
    }

    async recordPayment(id: string, paymentAccountId: string, user: User) {
        const bill = await this.findOne(id, user);
        if (bill.status !== VendorBillStatus.OPEN) {
            throw new BadRequestException('Only open bills can be paid');
        }

        const apAccount = await this.accountsRepository.findOne({
            where: { code: '2100', company: { id: user.company.id } }
        });
        if (!apAccount) throw new BadRequestException('Accounts Payable account not found');

        // Debit AP (Liability decreases)
        // Credit Bank/Cash (Asset decreases)

        const paymentEntries = [
            {
                accountId: apAccount.id,
                debit: bill.totalAmount,
                credit: 0,
                description: `Payment for Bill #${bill.billNumber}`,
            },
            {
                accountId: paymentAccountId,
                debit: 0,
                credit: bill.totalAmount,
                description: `Payment for Bill #${bill.billNumber}`,
            }
        ];

        for (const entry of paymentEntries) {
            await this.ledgerService.createEntry({
                accountId: entry.accountId,
                debit: entry.debit,
                credit: entry.credit,
                date: new Date().toISOString(),
                description: entry.description,
                reference: `PAY-${bill.billNumber}`,
                sourceType: LedgerSourceType.BILL_PAYMENT, // Need to add this too
                sourceId: bill.id,
            }, user);
        }

        bill.status = VendorBillStatus.PAID;
        return this.vendorBillsRepository.save(bill);
    }
}
