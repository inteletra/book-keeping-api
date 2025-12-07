import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';
import { AccountType, AccountSubType, InvoiceStatus } from '@bookkeeping/shared';
import * as bcrypt from 'bcrypt';

async function seed() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const dataSource = app.get(DataSource);

    try {
        console.log('🌱 Starting database seed...');

        // Get repositories
        const userRepo = dataSource.getRepository('User');
        const companyRepo = dataSource.getRepository('Company');
        const accountRepo = dataSource.getRepository('Account');
        const invoiceRepo = dataSource.getRepository('Invoice');

        // 1. Create/Get Company
        let company = await companyRepo.findOne({ where: { name: 'Demo Company LLC' } });
        if (!company) {
            company = await companyRepo.save({
                name: 'Demo Company LLC',
                currency: 'AED',
                fiscalYearStart: '01-01',
            });
            console.log('✅ Created company:', company.name);
        } else {
            console.log('✅ Company already exists:', company.name);
        }

        // 2. Create/Get User
        let user = await userRepo.findOne({ where: { email: 'user@example.com' }, relations: ['company'] });
        if (!user) {
            const hashedPassword = await bcrypt.hash('password', 10);
            user = await userRepo.save({
                email: 'user@example.com',
                password: hashedPassword,
                name: 'Demo User',
                role: 'ADMIN',
                company: company,
            });
            console.log('✅ Created user:', user.email);
        } else {
            console.log('✅ User already exists:', user.email);
        }

        // 3. Create Chart of Accounts
        const accounts = [
            // Assets
            { code: '1100', name: 'Cash', type: AccountType.ASSET, subType: AccountSubType.CURRENT_ASSET },
            { code: '1110', name: 'Petty Cash', type: AccountType.ASSET, subType: AccountSubType.CURRENT_ASSET },
            { code: '1200', name: 'Accounts Receivable', type: AccountType.ASSET, subType: AccountSubType.CURRENT_ASSET },
            { code: '1300', name: 'VAT Receivable', type: AccountType.ASSET, subType: AccountSubType.CURRENT_ASSET },
            { code: '1500', name: 'Inventory', type: AccountType.ASSET, subType: AccountSubType.CURRENT_ASSET },
            { code: '1700', name: 'Equipment', type: AccountType.ASSET, subType: AccountSubType.FIXED_ASSET },

            // Liabilities
            { code: '2100', name: 'Accounts Payable', type: AccountType.LIABILITY, subType: AccountSubType.CURRENT_LIABILITY },
            { code: '2200', name: 'VAT Payable', type: AccountType.LIABILITY, subType: AccountSubType.CURRENT_LIABILITY },
            { code: '2300', name: 'Salaries Payable', type: AccountType.LIABILITY, subType: AccountSubType.CURRENT_LIABILITY },

            // Equity
            { code: '3100', name: 'Owner\'s Equity', type: AccountType.EQUITY, subType: AccountSubType.EQUITY },
            { code: '3200', name: 'Retained Earnings', type: AccountType.EQUITY, subType: AccountSubType.RETAINED_EARNINGS },

            // Revenue
            { code: '4100', name: 'Sales Revenue', type: AccountType.REVENUE, subType: AccountSubType.OPERATING_REVENUE },
            { code: '4200', name: 'Service Revenue', type: AccountType.REVENUE, subType: AccountSubType.OPERATING_REVENUE },
            { code: '4900', name: 'Other Income', type: AccountType.REVENUE, subType: AccountSubType.OTHER_REVENUE },

            // Expenses
            { code: '5100', name: 'Cost of Goods Sold', type: AccountType.EXPENSE, subType: AccountSubType.COST_OF_GOODS_SOLD },
            { code: '5200', name: 'Rent Expense', type: AccountType.EXPENSE, subType: AccountSubType.OPERATING_EXPENSE },
            { code: '5300', name: 'Utilities Expense', type: AccountType.EXPENSE, subType: AccountSubType.OPERATING_EXPENSE },
            { code: '5400', name: 'Salaries Expense', type: AccountType.EXPENSE, subType: AccountSubType.OPERATING_EXPENSE },
            { code: '5500', name: 'Office Supplies', type: AccountType.EXPENSE, subType: AccountSubType.OPERATING_EXPENSE },
        ];

        for (const accountData of accounts) {
            const existing = await accountRepo.findOne({
                where: { code: accountData.code, company: { id: company.id } },
            });
            if (!existing) {
                await accountRepo.save({
                    ...accountData,
                    company: company,
                    balance: 0,
                    isActive: true,
                });
                console.log(`✅ Created account: ${accountData.code} - ${accountData.name}`);
            }
        }

        // 4. Create Sample Invoices
        const sampleInvoices = [
            {
                customerName: 'ABC Trading LLC',
                date: new Date('2025-01-15'),
                dueDate: new Date('2025-02-15'),
                status: InvoiceStatus.SENT,
                items: [
                    { description: 'Consulting Services', quantity: 10, unitPrice: 500, taxRate: 5 },
                    { description: 'Project Management', quantity: 5, unitPrice: 800, taxRate: 5 },
                ],
            },
            {
                customerName: 'XYZ Corporation',
                date: new Date('2025-01-20'),
                dueDate: new Date('2025-02-20'),
                status: InvoiceStatus.SENT,
                items: [
                    { description: 'Software Development', quantity: 20, unitPrice: 1000, taxRate: 5 },
                ],
            },
            {
                customerName: 'Global Solutions Inc',
                date: new Date('2025-01-25'),
                dueDate: new Date('2025-02-25'),
                status: InvoiceStatus.DRAFT,
                items: [
                    { description: 'Training Services', quantity: 8, unitPrice: 600, taxRate: 5 },
                ],
            },
        ];

        let invoiceCount = await invoiceRepo.count({ where: { company: { id: company.id } } });

        for (const invoiceData of sampleInvoices) {
            const items = invoiceData.items.map(item => ({
                ...item,
                amount: item.quantity * item.unitPrice,
                taxAmount: (item.quantity * item.unitPrice) * (item.taxRate / 100),
            }));

            const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
            const taxTotal = items.reduce((sum, item) => sum + item.taxAmount, 0);
            const total = subtotal + taxTotal;

            await invoiceRepo.save({
                invoiceNumber: `INV-${String(invoiceCount + 1).padStart(3, '0')}`,
                customerName: invoiceData.customerName,
                date: invoiceData.date,
                dueDate: invoiceData.dueDate,
                status: invoiceData.status,
                currency: 'AED',
                items: items,
                subtotal: subtotal,
                taxTotal: taxTotal,
                total: total,
                amountPaid: 0,
                balanceDue: total,
                company: company,
            });
            console.log(`✅ Created invoice for: ${invoiceData.customerName}`);
            invoiceCount++;
        }

        console.log('🎉 Database seed completed successfully!');
    } catch (error) {
        console.error('❌ Seed failed:', error);
        throw error;
    } finally {
        await app.close();
    }
}

seed()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
