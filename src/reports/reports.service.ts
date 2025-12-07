import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Invoice } from '../invoices/entities/invoice.entity';
import { Expense } from '../expenses/entities/expense.entity';
import { User } from '../users/entities/user.entity';
import { InvoiceStatus } from '@bookkeeping/shared';
import { LedgerService } from '../ledger/ledger.service';
import { AccountType, AccountSubType } from '@bookkeeping/shared';

@Injectable()
export class ReportsService {
    constructor(
        @InjectRepository(Invoice)
        private invoicesRepository: Repository<Invoice>,
        @InjectRepository(Expense)
        private expensesRepository: Repository<Expense>,
        private ledgerService: LedgerService,
    ) { }

    async getProfitLoss(user: User, startDate?: string, endDate?: string) {
        const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1);
        const end = endDate ? new Date(endDate) : new Date();

        return this.ledgerService.getProfitLoss(user, start, end);
    }

    async getDashboardStats(user: User) {
        // Quick stats for dashboard
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        const [monthlyInvoices, monthlyExpenses] = await Promise.all([
            this.invoicesRepository.find({
                where: {
                    company: { id: user.company.id },
                    date: Between(firstDayOfMonth, today),
                },
            }),
            this.expensesRepository.find({
                where: {
                    company: { id: user.company.id },
                    date: Between(firstDayOfMonth, today),
                },
            }),
        ]);

        const income = monthlyInvoices
            .filter(i => i.status === InvoiceStatus.PAID)
            .reduce((sum, i) => sum + Number(i.total), 0);

        const pendingIncome = monthlyInvoices
            .filter(i => i.status !== InvoiceStatus.PAID && i.status !== InvoiceStatus.CANCELLED)
            .reduce((sum, i) => sum + Number(i.total), 0);

        const expense = monthlyExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

        return {
            monthlyIncome: income,
            monthlyPendingIncome: pendingIncome,
            monthlyExpenses: expense,
            netProfit: income - expense,
        };
    }

    async getBalanceSheet(user: User, asOfDate: Date = new Date()) {
        // Get trial balance from ledger service
        const trialBalance = await this.ledgerService.getTrialBalance(asOfDate, user);

        // Initialize sections
        const assets: any[] = [];
        const liabilities: any[] = [];
        const equity: any[] = [];
        let revenue = 0;
        let expenses = 0;

        // Categorize accounts
        for (const entry of trialBalance) {
            switch (entry.accountType) {
                case AccountType.ASSET:
                    assets.push(entry);
                    break;
                case AccountType.LIABILITY:
                    liabilities.push(entry);
                    break;
                case AccountType.EQUITY:
                    equity.push(entry);
                    break;
                case AccountType.REVENUE:
                    revenue += entry.credit - entry.debit; // Revenue is credit normal
                    break;
                case AccountType.EXPENSE:
                    expenses += entry.debit - entry.credit; // Expense is debit normal
                    break;
            }
        }

        // Calculate Net Income (Retained Earnings)
        const netIncome = revenue - expenses;

        // Add Net Income to Equity
        if (netIncome !== 0) {
            equity.push({
                accountCode: 'RE-CURRENT',
                accountName: 'Net Income (Current Period)',
                accountType: AccountType.EQUITY,
                debit: netIncome < 0 ? Math.abs(netIncome) : 0,
                credit: netIncome > 0 ? netIncome : 0,
            });
        }

        // Calculate totals
        const totalAssets = assets.reduce((sum, a) => sum + (a.debit - a.credit), 0);
        const totalLiabilities = liabilities.reduce((sum, l) => sum + (l.credit - l.debit), 0);
        const totalEquity = equity.reduce((sum, e) => sum + (e.credit - e.debit), 0);

        return {
            asOfDate,
            assets: {
                accounts: assets,
                total: totalAssets
            },
            liabilities: {
                accounts: liabilities,
                total: totalLiabilities
            },
            equity: {
                accounts: equity,
                total: totalEquity,
                netIncome
            },
            summary: {
                totalAssets,
                totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
                isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01
            }
        };

    }

    async getCashFlowStatement(user: User, startDate: string, endDate: string) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const startPrev = new Date(start);
        startPrev.setDate(startPrev.getDate() - 1);

        // 1. Net Income (Operating Start)
        const pl = await this.ledgerService.getProfitLoss(user, start, end);
        const netIncome = pl.netProfit;

        // 2. Get Balances
        const startTB = await this.ledgerService.getTrialBalance(startPrev, user);
        const endTB = await this.ledgerService.getTrialBalance(end, user);

        // Map accounts for easy lookup
        const accountMap = new Map<string, { start: number; end: number; type: AccountType; subType?: AccountSubType; name: string; code: string }>();

        // Populate from Start TB
        for (const entry of startTB) {
            // Trial Balance returns debit/credit. Convert to net balance (Debit positive)
            const bal = entry.debit - entry.credit;
            accountMap.set(entry.accountCode, {
                start: bal,
                end: 0,
                type: entry.accountType,
                subType: entry.accountSubType, // Need to ensure TB returns subType
                name: entry.accountName,
                code: entry.accountCode
            });
        }

        // Populate from End TB
        for (const entry of endTB) {
            const bal = entry.debit - entry.credit;
            if (accountMap.has(entry.accountCode)) {
                const data = accountMap.get(entry.accountCode)!;
                data.end = bal;
            } else {
                accountMap.set(entry.accountCode, {
                    start: 0,
                    end: bal,
                    type: entry.accountType,
                    subType: entry.accountSubType,
                    name: entry.accountName,
                    code: entry.accountCode
                });
            }
        }

        // Initialize Sections
        const operatingActivities: any[] = [];
        const investingActivities: any[] = [];
        const financingActivities: any[] = [];
        let cashStart = 0;
        let cashEnd = 0;

        // Process Accounts
        for (const [code, data] of accountMap) {
            // Skip Revenue/Expense (already in Net Income)
            if (data.type === AccountType.REVENUE || data.type === AccountType.EXPENSE) continue;

            // Identify Cash Accounts (Codes 10xx and 11xx)
            const isCash = code.startsWith('10') || code.startsWith('11');

            if (isCash) {
                cashStart += data.start;
                cashEnd += data.end;
                continue;
            }

            // Calculate Change
            // For Assets: Decrease is Inflow (+), Increase is Outflow (-) => Start - End
            // For Liab/Eq: Increase is Inflow (+), Decrease is Outflow (-) => End - Start
            let change = 0;
            if (data.type === AccountType.ASSET) {
                change = data.start - data.end;
            } else {
                change = data.end - data.start;
            }

            if (change === 0) continue;

            const item = {
                accountCode: data.code,
                accountName: data.name,
                amount: change
            };

            // Categorize
            // Note: We need subType from TB. If not available, we might need to fetch account details or infer.
            // For now, assuming standard chart of accounts structure based on types.

            if (data.type === AccountType.ASSET) {
                if (data.code.startsWith('1')) { // Current Assets (1xxx) excluding Cash
                    operatingActivities.push(item);
                } else { // Fixed/Other Assets (Non-current)
                    investingActivities.push(item);
                }
            } else if (data.type === AccountType.LIABILITY) {
                if (data.code.startsWith('2')) { // Current Liabilities (2xxx)
                    operatingActivities.push(item);
                } else { // Long Term Liabilities
                    financingActivities.push(item);
                }
            } else if (data.type === AccountType.EQUITY) {
                // Exclude Retained Earnings (calculated via Net Income)
                if (data.name.includes('Retained Earnings') || data.code === '3002') { // 3002 is usually Retained Earnings
                    continue;
                }
                financingActivities.push(item);
            }
        }

        const netCashOperating = netIncome + operatingActivities.reduce((sum, i) => sum + i.amount, 0);
        const netCashInvesting = investingActivities.reduce((sum, i) => sum + i.amount, 0);
        const netCashFinancing = financingActivities.reduce((sum, i) => sum + i.amount, 0);

        const netChangeInCash = netCashOperating + netCashInvesting + netCashFinancing;

        return {
            period: { startDate, endDate },
            operating: {
                netIncome,
                adjustments: operatingActivities,
                total: netCashOperating
            },
            investing: {
                activities: investingActivities,
                total: netCashInvesting
            },
            financing: {
                activities: financingActivities,
                total: netCashFinancing
            },
            summary: {
                cashAtBeginning: cashStart,
                cashAtEnd: cashEnd,
                netChange: netChangeInCash,
                discrepancy: (cashEnd - cashStart) - netChangeInCash // Should be 0
            }
        };
    }
    async getVatReport(user: User, startDate: string, endDate: string) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        // 1. Output VAT (Sales)
        const invoices = await this.invoicesRepository.find({
            where: {
                company: { id: user.company.id },
                date: Between(start, end),
            }
        });

        const validInvoices = invoices.filter(i =>
            i.status !== InvoiceStatus.DRAFT &&
            i.status !== InvoiceStatus.CANCELLED
        );

        const standardRatedSales = validInvoices.reduce((acc, inv) => {
            const total = Number(inv.total);
            const tax = Number(inv.taxTotal || 0);
            return {
                taxableAmount: acc.taxableAmount + (total - tax),
                vatAmount: acc.vatAmount + tax,
                totalAmount: acc.totalAmount + total
            };
        }, { taxableAmount: 0, vatAmount: 0, totalAmount: 0 });

        // 2. Input VAT (Expenses)
        const expenses = await this.expensesRepository.find({
            where: {
                company: { id: user.company.id },
                date: Between(start, end)
            }
        });

        const standardRatedExpenses = expenses.reduce((acc, exp) => {
            const amount = Number(exp.amount);
            const tax = Number(exp.taxAmount || 0);
            return {
                taxableAmount: acc.taxableAmount + (amount - tax),
                vatAmount: acc.vatAmount + tax,
                totalAmount: acc.totalAmount + amount
            };
        }, { taxableAmount: 0, vatAmount: 0, totalAmount: 0 });

        // 3. Net VAT
        const netVatPayable = standardRatedSales.vatAmount - standardRatedExpenses.vatAmount;

        return {
            period: { startDate, endDate },
            sales: {
                standardRated: standardRatedSales,
                total: standardRatedSales
            },
            expenses: {
                standardRated: standardRatedExpenses,
                total: standardRatedExpenses
            },
            netVatPayable
        };
    }
}
