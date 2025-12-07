import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Between } from 'typeorm';
import { BankTransaction, BankTransactionStatus } from './entities/bank-transaction.entity';
import { LedgerEntry } from '../ledger/entities/ledger-entry.entity';
import { Account } from '../accounts/entities/account.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class BankingService {
    constructor(
        @InjectRepository(BankTransaction)
        private bankTransactionRepository: Repository<BankTransaction>,
        @InjectRepository(LedgerEntry)
        private ledgerEntryRepository: Repository<LedgerEntry>,
        @InjectRepository(Account)
        private accountRepository: Repository<Account>,
    ) { }

    async importStatement(accountId: string, fileBuffer: Buffer, user: User) {
        const account = await this.accountRepository.findOne({ where: { id: accountId, company: { id: user.company.id } } });
        if (!account) throw new NotFoundException('Account not found');

        const csvContent = fileBuffer.toString('utf-8');
        const lines = csvContent.split('\n');
        const transactions: BankTransaction[] = [];

        // Skip header if present (simple check)
        const startIndex = lines[0].toLowerCase().includes('date') ? 1 : 0;

        for (let i = startIndex; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            // Expected format: Date, Description, Amount, Reference
            const [dateStr, description, amountStr, reference] = line.split(',').map(s => s.trim());

            if (!dateStr || !amountStr) continue;

            const amount = parseFloat(amountStr);
            if (isNaN(amount)) continue;

            const transaction = this.bankTransactionRepository.create({
                date: new Date(dateStr),
                description: description || 'Imported Transaction',
                amount,
                reference: reference || undefined,
                account,
                status: BankTransactionStatus.PENDING,
            });

            transactions.push(transaction);
        }

        return this.bankTransactionRepository.save(transactions);
    }

    async getReconciliationData(accountId: string, user: User) {
        // Get unmatched bank transactions
        const bankTransactions = await this.bankTransactionRepository.find({
            where: {
                accountId,
                status: BankTransactionStatus.PENDING,
            },
            order: { date: 'ASC' }
        });

        // Get unmatched ledger entries for this account
        // We need to find ledger entries that are NOT linked to any bank transaction
        // Since the relation is on BankTransaction side, we can query LedgerEntry directly
        // But we don't have a back-relation on LedgerEntry to BankTransaction easily queryable without join
        // So we'll fetch all ledger entries for the account and filter out those that are matched.
        // Actually, a better way is to add a flag or relation on LedgerEntry, or use a subquery.
        // For now, let's fetch all ledger entries and filter.
        // Wait, LedgerEntry doesn't know if it's matched. BankTransaction knows.

        // Let's get all matched ledger entry IDs first
        const matchedTxs = await this.bankTransactionRepository.find({
            where: { accountId, status: BankTransactionStatus.MATCHED },
            select: ['matchedLedgerEntryId']
        });
        const matchedIds = matchedTxs.map(t => t.matchedLedgerEntryId).filter(id => id);

        const ledgerEntries = await this.ledgerEntryRepository.find({
            where: {
                accountId,
                company: { id: user.company.id }
            },
            order: { date: 'ASC' },
            take: 500 // Limit for performance, maybe paginate later
        });

        const unmatchedLedgerEntries = ledgerEntries.filter(entry => !matchedIds.includes(entry.id));

        // Calculate balances
        // System Balance: Sum of all ledger entries
        const systemBalance = await this.ledgerEntryRepository
            .createQueryBuilder('entry')
            .where('entry.accountId = :accountId', { accountId })
            .select('SUM(entry.debit - entry.credit)', 'balance') // Asset: Debit - Credit
            .getRawOne();

        // Adjusted Bank Balance: We don't have the real bank balance unless user inputs it.
        // We can sum matched transactions + unmatched bank transactions? No.
        // Usually user provides "Statement Ending Balance".

        return {
            bankTransactions,
            ledgerEntries: unmatchedLedgerEntries,
            systemBalance: parseFloat(systemBalance?.balance || '0')
        };
    }

    async matchTransaction(bankTxId: string, ledgerEntryId: string, user: User) {
        const bankTx = await this.bankTransactionRepository.findOne({
            where: { id: bankTxId },
            relations: ['account']
        });
        if (!bankTx) throw new NotFoundException('Bank transaction not found');
        if (bankTx.account.company.id !== user.company.id) throw new BadRequestException('Unauthorized');

        const ledgerEntry = await this.ledgerEntryRepository.findOne({
            where: { id: ledgerEntryId, company: { id: user.company.id } }
        });
        if (!ledgerEntry) throw new NotFoundException('Ledger entry not found');

        // Verify amounts match (approximately? or exact?)
        // Bank Deposit (+) should match Ledger Debit (+) for Asset
        // Bank Withdrawal (-) should match Ledger Credit (-) for Asset (which is negative net?)
        // LedgerEntry has debit and credit columns.
        // If Bank Amount > 0 (Deposit), Ledger should have Debit > 0.
        // If Bank Amount < 0 (Withdrawal), Ledger should have Credit > 0.

        const isDeposit = bankTx.amount > 0;
        const ledgerAmount = isDeposit ? ledgerEntry.debit : ledgerEntry.credit;

        // Allow slight difference? For now, exact match on the relevant side.
        // Note: LedgerEntry might be a split, so we check the specific debit/credit.

        if (Math.abs(Math.abs(bankTx.amount) - ledgerAmount) > 0.01) {
            // throw new BadRequestException('Amounts do not match');
            // Warn but allow? Strict for now.
            // Actually, let's allow it but maybe flag it? No, strict for MVP.
            throw new BadRequestException(`Amount mismatch: Bank ${bankTx.amount} vs Ledger ${ledgerAmount}`);
        }

        bankTx.matchedLedgerEntry = ledgerEntry;
        bankTx.status = BankTransactionStatus.MATCHED;
        return this.bankTransactionRepository.save(bankTx);
    }

    async unmatchTransaction(bankTxId: string, user: User) {
        const bankTx = await this.bankTransactionRepository.findOne({
            where: { id: bankTxId },
            relations: ['account']
        });
        if (!bankTx) throw new NotFoundException('Bank transaction not found');
        if (bankTx.account.company.id !== user.company.id) throw new BadRequestException('Unauthorized');

        bankTx.matchedLedgerEntry = null as any;
        bankTx.matchedLedgerEntryId = null;
        bankTx.status = BankTransactionStatus.PENDING;
        return this.bankTransactionRepository.save(bankTx);
    }
}
