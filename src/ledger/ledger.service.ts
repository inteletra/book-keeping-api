import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { LedgerEntry } from './entities/ledger-entry.entity';
import { LedgerSourceType, AccountType } from '@bookkeeping/shared';
import { Account } from '../accounts/entities/account.entity';
import { User } from '../users/entities/user.entity';
import { CreateLedgerEntryDto, LedgerFilters } from './dto/ledger.dto';

@Injectable()
export class LedgerService {
    constructor(
        @InjectRepository(LedgerEntry)
        private ledgerRepository: Repository<LedgerEntry>,
        @InjectRepository(Account)
        private accountsRepository: Repository<Account>,
    ) { }

    async createEntry(dto: CreateLedgerEntryDto | { entries: any[], date: string, description: string, reference: string, sourceType: LedgerSourceType, sourceId: string }, user: User): Promise<LedgerEntry[]> {
        const savedEntries: LedgerEntry[] = [];

        if ('entries' in dto && Array.isArray(dto.entries)) {
            // Handle multi-entry transaction
            for (const entryDto of dto.entries) {
                const ledgerEntry = this.ledgerRepository.create({
                    accountId: entryDto.accountId,
                    debit: entryDto.debit,
                    credit: entryDto.credit,
                    date: dto.date,
                    description: entryDto.description || dto.description,
                    reference: dto.reference,
                    sourceType: dto.sourceType,
                    sourceId: dto.sourceId,
                    companyId: user.company.id,
                    postedById: user.id,
                });
                savedEntries.push(await this.ledgerRepository.save(ledgerEntry));
            }
        } else {
            // Handle single entry (backward compatibility)
            const singleDto = dto as CreateLedgerEntryDto;
            const ledgerEntry = this.ledgerRepository.create({
                ...singleDto,
                companyId: user.company.id,
                postedById: user.id,
            });
            savedEntries.push(await this.ledgerRepository.save(ledgerEntry));
        }

        // Update account balances
        const accountIds = [...new Set(savedEntries.map(e => e.accountId))];
        for (const accountId of accountIds) {
            await this.updateAccountBalance(accountId, user.company.id);
        }

        return savedEntries;
    }

    async postInvoiceToLedger(invoice: any, user: User): Promise<void> {
        const invoiceDate = new Date(invoice.date);

        // Find accounts by code
        const arAccount = await this.findAccountByCode('1200', user.company.id); // Accounts Receivable
        const revenueAccount = await this.findAccountByCode('4100', user.company.id); // Sales Revenue
        const vatAccount = await this.findAccountByCode('2200', user.company.id); // VAT Payable

        // DR Accounts Receivable
        await this.createEntry({
            accountId: arAccount.id,
            debit: invoice.total,
            credit: 0,
            date: invoiceDate.toISOString(),
            description: `Invoice ${invoice.invoiceNumber} - ${invoice.customer?.name || 'Customer'}`,
            reference: invoice.invoiceNumber,
            sourceType: LedgerSourceType.INVOICE,
            sourceId: invoice.id,
        }, user);

        // CR Sales Revenue
        const subtotal = invoice.total - (invoice.tax || 0);
        await this.createEntry({
            accountId: revenueAccount.id,
            debit: 0,
            credit: subtotal,
            date: invoiceDate.toISOString(),
            description: `Invoice ${invoice.invoiceNumber} - ${invoice.customer?.name || 'Customer'}`,
            reference: invoice.invoiceNumber,
            sourceType: LedgerSourceType.INVOICE,
            sourceId: invoice.id,
        }, user);

        // CR VAT Payable (if applicable)
        if (invoice.tax && invoice.tax > 0) {
            await this.createEntry({
                accountId: vatAccount.id,
                debit: 0,
                credit: invoice.tax,
                date: invoiceDate.toISOString(),
                description: `VAT on Invoice ${invoice.invoiceNumber}`,
                reference: invoice.invoiceNumber,
                sourceType: LedgerSourceType.INVOICE,
                sourceId: invoice.id,
            }, user);
        }
    }

    async postExpenseToLedger(expense: any, user: User): Promise<void> {
        const expenseDate = new Date(expense.date);

        // Find accounts
        const expenseAccount = await this.findAccountByCode('5200', user.company.id); // Operating Expenses
        const vatReceivableAccount = await this.findAccountByCode('1300', user.company.id); // VAT Receivable
        const apAccount = await this.findAccountByCode('2100', user.company.id); // Accounts Payable

        // DR Expense Account
        const amountBeforeTax = expense.amount - (expense.taxAmount || 0);
        await this.createEntry({
            accountId: expenseAccount.id,
            debit: amountBeforeTax,
            credit: 0,
            date: expenseDate.toISOString(),
            description: `Expense: ${expense.description}`,
            reference: expense.reference || `EXP-${expense.id.substring(0, 8)}`,
            sourceType: LedgerSourceType.EXPENSE,
            sourceId: expense.id,
        }, user);

        // DR VAT Receivable (if applicable)
        if (expense.taxAmount && expense.taxAmount > 0) {
            await this.createEntry({
                accountId: vatReceivableAccount.id,
                debit: expense.taxAmount,
                credit: 0,
                date: expenseDate.toISOString(),
                description: `VAT on Expense: ${expense.description}`,
                reference: expense.reference || `EXP-${expense.id.substring(0, 8)}`,
                sourceType: LedgerSourceType.EXPENSE,
                sourceId: expense.id,
            }, user);
        }

        // CR Accounts Payable
        await this.createEntry({
            accountId: apAccount.id,
            debit: 0,
            credit: expense.amount,
            date: expenseDate.toISOString(),
            description: `Expense: ${expense.description}`,
            reference: expense.reference || `EXP-${expense.id.substring(0, 8)}`,
            sourceType: LedgerSourceType.EXPENSE,
            sourceId: expense.id,
        }, user);
    }

    async postJournalEntryToLedger(journalEntry: any, user: User): Promise<void> {
        const entryDate = new Date(journalEntry.date);

        for (const line of journalEntry.lines) {
            await this.createEntry({
                accountId: line.accountId,
                debit: line.type === 'DEBIT' ? line.amount : 0,
                credit: line.type === 'CREDIT' ? line.amount : 0,
                date: entryDate.toISOString(),
                description: journalEntry.description || `Journal Entry ${journalEntry.entryNumber}`,
                reference: journalEntry.entryNumber,
                sourceType: LedgerSourceType.JOURNAL_ENTRY,
                sourceId: journalEntry.id,
            }, user);
        }
    }

    async getEntries(filters: LedgerFilters, user: User): Promise<LedgerEntry[]> {
        const where: any = {
            company: { id: user.company.id },
        };

        if (filters.accountId) {
            where.accountId = filters.accountId;
        }

        if (filters.sourceType) {
            where.sourceType = filters.sourceType;
        }

        if (filters.dateFrom && filters.dateTo) {
            where.date = Between(new Date(filters.dateFrom), new Date(filters.dateTo));
        }

        return this.ledgerRepository.find({
            where,
            relations: ['account', 'postedBy'],
            order: { date: 'DESC', createdAt: 'DESC' },
        });
    }

    async getAccountLedger(accountId: string, user: User): Promise<LedgerEntry[]> {
        return this.ledgerRepository.find({
            where: {
                accountId,
                company: { id: user.company.id },
            },
            relations: ['account', 'postedBy'],
            order: { date: 'ASC', createdAt: 'ASC' },
        });
    }

    private async findAccountByCode(code: string, companyId: string): Promise<Account> {
        const account = await this.accountsRepository.findOne({
            where: { code, company: { id: companyId } },
        });

        if (!account) {
            throw new NotFoundException(`Account with code ${code} not found. Please ensure default accounts are seeded.`);
        }

        return account;
    }

    private async updateAccountBalance(accountId: string, companyId: string): Promise<void> {
        // Calculate balance: SUM(debits) - SUM(credits)
        const result = await this.ledgerRepository
            .createQueryBuilder('entry')
            .select('SUM(entry.debit)', 'totalDebit')
            .addSelect('SUM(entry.credit)', 'totalCredit')
            .where('entry.accountId = :accountId', { accountId })
            .andWhere('entry.companyId = :companyId', { companyId })
            .getRawOne();

        const totalDebit = parseFloat(result.totalDebit || '0');
        const totalCredit = parseFloat(result.totalCredit || '0');
        const balance = totalDebit - totalCredit;

        // Update account balance
        await this.accountsRepository.update(
            { id: accountId },
            { balance }
        );
    }

    async reverseEntry(sourceId: string, sourceType: LedgerSourceType, user: User): Promise<void> {
        // Find all entries for this source
        const entries = await this.ledgerRepository.find({
            where: {
                sourceId,
                sourceType,
                company: { id: user.company.id },
            },
        });

        // Create reversing entries
        for (const entry of entries) {
            await this.createEntry({
                accountId: entry.accountId,
                debit: entry.credit, // Swap debit and credit
                credit: entry.debit,
                date: new Date().toISOString(),
                description: `REVERSAL: ${entry.description}`,
                reference: entry.reference,
                sourceType: LedgerSourceType.MANUAL,
                sourceId: entry.id,
            }, user);
        }
    }

    async getTrialBalance(asOfDate: Date, user: User): Promise<any[]> {
        // Get all accounts for the company
        const accounts = await this.accountsRepository.find({
            where: { company: { id: user.company.id }, isActive: true },
            order: { code: 'ASC' },
        });

        const trialBalance: any[] = [];

        for (const account of accounts) {
            // Calculate total debits and credits for this account up to asOfDate
            const result = await this.ledgerRepository
                .createQueryBuilder('entry')
                .select('SUM(entry.debit)', 'totalDebit')
                .addSelect('SUM(entry.credit)', 'totalCredit')
                .where('entry.accountId = :accountId', { accountId: account.id })
                .andWhere('entry.companyId = :companyId', { companyId: user.company.id })
                .andWhere('entry.date <= :asOfDate', { asOfDate })
                .getRawOne();

            const totalDebit = parseFloat(result.totalDebit || '0');
            const totalCredit = parseFloat(result.totalCredit || '0');
            const balance = totalDebit - totalCredit;

            // Only include accounts with activity
            if (totalDebit > 0 || totalCredit > 0) {
                trialBalance.push({
                    accountCode: account.code,
                    accountName: account.name,
                    accountType: account.type,
                    debit: balance > 0 ? balance : 0,
                    credit: balance < 0 ? Math.abs(balance) : 0,
                });
            }

        }

        return trialBalance;
    }

    async getProfitLoss(user: User, startDate: Date, endDate: Date) {
        // Get all Revenue and Expense accounts
        const accounts = await this.accountsRepository.find({
            where: {
                company: { id: user.company.id },
                isActive: true,
            },
            order: { code: 'ASC' },
        });

        // Filter for Revenue and Expense types explicitly
        const pnlAccounts = accounts.filter(a =>
            a.type === AccountType.REVENUE || a.type === AccountType.EXPENSE
        );

        const revenue: any[] = [];
        const expenses: any[] = [];

        for (const account of pnlAccounts) {
            // Calculate total debits and credits for this account within the period
            const result = await this.ledgerRepository
                .createQueryBuilder('entry')
                .select('SUM(entry.debit)', 'totalDebit')
                .addSelect('SUM(entry.credit)', 'totalCredit')
                .where('entry.accountId = :accountId', { accountId: account.id })
                .andWhere('entry.companyId = :companyId', { companyId: user.company.id })
                .andWhere('entry.date >= :startDate', { startDate })
                .andWhere('entry.date <= :endDate', { endDate })
                .getRawOne();

            const totalDebit = parseFloat(result.totalDebit || '0');
            const totalCredit = parseFloat(result.totalCredit || '0');

            // For Revenue: Credit - Debit (Credit normal)
            // For Expense: Debit - Credit (Debit normal)
            const balance = account.type === AccountType.REVENUE
                ? totalCredit - totalDebit
                : totalDebit - totalCredit;

            // Only include accounts with activity
            if (totalDebit > 0 || totalCredit > 0) {
                const entry = {
                    accountCode: account.code,
                    accountName: account.name,
                    accountType: account.type,
                    amount: balance,
                };

                if (account.type === AccountType.REVENUE) {
                    revenue.push(entry);
                } else {
                    expenses.push(entry);
                }
            }
        }

        const totalRevenue = revenue.reduce((sum, r) => sum + r.amount, 0);
        const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
        const netProfit = totalRevenue - totalExpenses;

        return {
            period: { startDate, endDate },
            revenue: {
                accounts: revenue,
                total: totalRevenue
            },
            expenses: {
                accounts: expenses,
                total: totalExpenses
            },
            netProfit
        };
    }
}
