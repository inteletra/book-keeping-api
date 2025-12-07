import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AuthService } from './auth/auth.service';
import { InvoicesService } from './invoices/invoices.service';
import { ExpensesService } from './expenses/expenses.service';
import { JournalEntriesService } from './journal-entries/journal-entries.service';
import { AccountsService } from './accounts/accounts.service';
import { UserRole, Currency, InvoiceStatus } from '@bookkeeping/shared';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './users/entities/user.entity';
import { Repository } from 'typeorm';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);

    const authService = app.get(AuthService);
    const invoicesService = app.get(InvoicesService);
    const expensesService = app.get(ExpensesService);
    const journalEntriesService = app.get(JournalEntriesService);
    const accountsService = app.get(AccountsService);
    const usersRepository = app.get<Repository<User>>(getRepositoryToken(User));

    console.log('🌱 Seeding demo account...\n');

    // 1. Create Demo User
    console.log('📝 Creating demo user...');
    let demoAuth;
    try {
        demoAuth = await authService.register({
            email: 'demo@bookkeeping.com',
            password: 'Demo123!',
            fullName: 'Demo User',
            role: UserRole.ADMIN,
            companyName: 'Demo General Trading LLC',
        });
        console.log('✅ Demo user created: demo@bookkeeping.com / Demo123!\n');
    } catch (error) {
        console.log('ℹ️  Demo user already exists, logging in...');
        demoAuth = await authService.login({
            email: 'demo@bookkeeping.com',
            password: 'Demo123!',
        });
        console.log('✅ Logged in as demo user\n');
    }

    // Get the full user object with company
    const demoUser = await usersRepository.findOne({
        where: { id: demoAuth.user.id },
        relations: ['company'],
    });

    if (!demoUser || !demoUser.company) {
        console.error('❌ Failed to get demo user with company');
        await app.close();
        return;
    }

    console.log(`✅ Company: ${demoUser.company.name} (${demoUser.company.id})\n`);

    // 2. Get Chart of Accounts
    console.log('📊 Fetching chart of accounts...');
    const accounts = await accountsService.findAll(demoUser);
    const cashAccount = accounts.find(a => a.name === 'Cash');
    const arAccount = accounts.find(a => a.name === 'Accounts Receivable');
    const revenueAccount = accounts.find(a => a.name === 'Sales Revenue');
    const expenseAccount = accounts.find(a => a.name === 'Operating Expenses');
    console.log(`✅ Found ${accounts.length} accounts\n`);

    // 3. Create Invoices
    console.log('💰 Creating invoices...');

    // Paid Invoice
    const paidInvoice = await invoicesService.create({
        customerName: 'Al Futtaim Group',
        date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        dueDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        currency: Currency.AED,
        items: [
            { description: 'Consulting Services - Q4 2024', quantity: 1, unitPrice: 15000, taxRate: 5 },
            { description: 'Project Management', quantity: 40, unitPrice: 250, taxRate: 5 },
        ],
        notes: 'Payment terms: Net 15 days',
        status: InvoiceStatus.SENT,
    }, demoUser);

    // Mark as paid (skipping for now due to ledger issue)
    // if (cashAccount) {
    //     await invoicesService.recordPayment(
    //         paidInvoice.id,
    //         paidInvoice.total,
    //         new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    //         'Bank Transfer',
    //         cashAccount.id,
    //         'TRF-2024-001',
    //         demoUser
    //     );
    // }
    console.log('  ✓ Invoice: Al Futtaim Group - AED 26,250.00');

    // Overdue Invoice
    const overdueInvoice = await invoicesService.create({
        customerName: 'Emaar Properties',
        date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        dueDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        currency: Currency.AED,
        items: [
            { description: 'Marketing Campaign Design', quantity: 1, unitPrice: 8000, taxRate: 5 },
            { description: 'Digital Assets Creation', quantity: 20, unitPrice: 150, taxRate: 5 },
        ],
        notes: 'Overdue - Please remit payment',
        status: InvoiceStatus.SENT,
    }, demoUser);
    console.log('  ✓ Overdue invoice: Emaar Properties - AED 11,550.00');

    // Open Invoice (Recent)
    const openInvoice = await invoicesService.create({
        customerName: 'Carrefour UAE',
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        dueDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
        currency: Currency.AED,
        items: [
            { description: 'Software Development Services', quantity: 80, unitPrice: 300, taxRate: 5 },
            { description: 'Testing & QA', quantity: 20, unitPrice: 200, taxRate: 5 },
        ],
        notes: 'Payment terms: Net 30 days',
        status: InvoiceStatus.SENT,
    }, demoUser);
    console.log('  ✓ Open invoice: Carrefour UAE - AED 29,400.00');

    // Partially Paid Invoice
    const partialInvoice = await invoicesService.create({
        customerName: 'Dubai Holding',
        date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        currency: Currency.AED,
        items: [
            { description: 'Annual Support Contract', quantity: 1, unitPrice: 50000, taxRate: 5 },
        ],
        notes: 'Partial payment received',
        status: InvoiceStatus.SENT,
    }, demoUser);

    // Partial payment (skipping for now)
    // if (cashAccount) {
    //     await invoicesService.recordPayment(
    //         partialInvoice.id,
    //         25000,
    //         new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    //         'Bank Transfer',
    //         cashAccount.id,
    //         'TRF-2024-002',
    //         demoUser
    //     );
    // }
    console.log('  ✓ Invoice: Dubai Holding - AED 52,500.00\n');

    // 4. Create Expenses
    console.log('💸 Creating expenses...');

    await expensesService.create({
        description: 'Office Rent - December 2024',
        amount: 12000,
        taxAmount: 0,
        date: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
        category: 'Rent',
        vendor: 'Emirates Real Estate',
    }, demoUser);
    console.log('  ✓ Office Rent - AED 12,000.00');

    await expensesService.create({
        description: 'DEWA Utilities - November 2024',
        amount: 850,
        taxAmount: 0,
        date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        category: 'Utilities',
        vendor: 'DEWA',
    }, demoUser);
    console.log('  ✓ DEWA Utilities - AED 850.00');

    await expensesService.create({
        description: 'Etisalat Business Internet',
        amount: 599,
        taxAmount: 0,
        date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        category: 'Telecommunications',
        vendor: 'Etisalat',
    }, demoUser);
    console.log('  ✓ Etisalat Internet - AED 599.00');

    await expensesService.create({
        description: 'Microsoft 365 Business Subscription',
        amount: 450,
        taxAmount: 0,
        date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        category: 'Software',
        vendor: 'Microsoft',
    }, demoUser);
    console.log('  ✓ Microsoft 365 - AED 450.00');

    await expensesService.create({
        description: 'Office Supplies - Stationery',
        amount: 320,
        taxAmount: 16,
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        category: 'Office Supplies',
        vendor: 'Staples UAE',
    }, demoUser);
    console.log('  ✓ Office Supplies - AED 336.00');

    await expensesService.create({
        description: 'Team Lunch - Client Meeting',
        amount: 280,
        taxAmount: 0,
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        category: 'Meals & Entertainment',
        vendor: 'Zuma Dubai',
    }, demoUser);
    console.log('  ✓ Team Lunch - AED 280.00\n');

    // 5. Create Journal Entries (Opening Balances)
    console.log('📖 Creating journal entries...');

    if (cashAccount) {
        const equityAccount = accounts.find(a => a.name === 'Owner\'s Equity');
        if (equityAccount) {
            await journalEntriesService.create({
                date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
                description: 'Opening Balance - Cash',
                lines: [
                    {
                        accountCode: cashAccount.code,
                        accountName: cashAccount.name,
                        type: 'DEBIT' as any,
                        amount: 50000,
                        description: 'Initial cash balance',
                    },
                    {
                        accountCode: equityAccount.code,
                        accountName: equityAccount.name,
                        type: 'CREDIT' as any,
                        amount: 50000,
                        description: 'Owner\'s capital',
                    },
                ],
            }, demoUser);
            console.log('  ✓ Opening balance entry - AED 50,000.00\n');
        }
    }

    console.log('✅ Demo account seeded successfully!\n');
    console.log('═══════════════════════════════════════════════');
    console.log('📧 Email: demo@bookkeeping.com');
    console.log('🔑 Password: Demo123!');
    console.log('═══════════════════════════════════════════════\n');

    await app.close();
}

bootstrap();
