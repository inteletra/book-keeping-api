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
import { Repository, DataSource } from 'typeorm';

/**
 * Migration and Seeding Script
 * 
 * This script performs two main functions:
 * 1. Database Migration: Automatically creates all tables and schema based on TypeORM entities
 * 2. Data Seeding: Populates the database with demo data for testing and development
 * 
 * Usage: npm run migrate:seed
 */

async function bootstrap() {
    console.log('🚀 Starting Database Migration and Seeding...\n');
    console.log('═══════════════════════════════════════════════\n');

    const app = await NestFactory.createApplicationContext(AppModule);

    try {
        // ========================================
        // STEP 1: DATABASE MIGRATION
        // ========================================
        console.log('📦 STEP 1: Running Database Migration...\n');

        const dataSource = app.get(DataSource);

        // Synchronize database schema (creates tables if they don't exist)
        console.log('  ⏳ Synchronizing database schema...');
        await dataSource.synchronize();
        console.log('  ✅ Database schema synchronized successfully!\n');

        // ========================================
        // STEP 2: DATA SEEDING
        // ========================================
        console.log('🌱 STEP 2: Seeding Database with Demo Data...\n');

        const authService = app.get(AuthService);
        const invoicesService = app.get(InvoicesService);
        const expensesService = app.get(ExpensesService);
        const journalEntriesService = app.get(JournalEntriesService);
        const accountsService = app.get(AccountsService);
        const usersRepository = app.get<Repository<User>>(getRepositoryToken(User));

        // ========================================
        // 2.1: Create Demo User and Company
        // ========================================
        console.log('👤 Creating demo user and company...');
        let demoAuth;
        try {
            demoAuth = await authService.register({
                email: 'demo@bookkeeping.com',
                password: 'Demo123!',
                fullName: 'Demo User',
                role: UserRole.ADMIN,
                companyName: 'Demo General Trading LLC',
            });
            console.log('  ✅ Demo user created: demo@bookkeeping.com');
        } catch (error) {
            console.log('  ℹ️  Demo user already exists, logging in...');
            demoAuth = await authService.login({
                email: 'demo@bookkeeping.com',
                password: 'Demo123!',
            });
        }

        // Get the full user object with company
        const demoUser = await usersRepository.findOne({
            where: { id: demoAuth.user.id },
            relations: ['company'],
        });

        if (!demoUser || !demoUser.company) {
            throw new Error('Failed to get demo user with company');
        }

        console.log(`  ✅ Company: ${demoUser.company.name}\n`);

        // ========================================
        // 2.2: Create Super Admin User
        // ========================================
        console.log('👑 Creating super admin user...');
        try {
            await authService.register({
                email: 'admin@bookkeeping.com',
                password: 'Admin123!',
                fullName: 'Super Admin',
                role: UserRole.SUPER_ADMIN,
                companyName: 'Bookkeeping UAE Platform',
            });
            console.log('  ✅ Super admin created: admin@bookkeeping.com\n');
        } catch (error) {
            console.log('  ℹ️  Super admin already exists\n');
        }

        // ========================================
        // 2.3: Get Chart of Accounts
        // ========================================
        console.log('📊 Fetching chart of accounts...');
        const accounts = await accountsService.findAll(demoUser);
        const cashAccount = accounts.find(a => a.name === 'Cash');
        const arAccount = accounts.find(a => a.name === 'Accounts Receivable');
        const revenueAccount = accounts.find(a => a.name === 'Sales Revenue');
        const expenseAccount = accounts.find(a => a.name === 'Operating Expenses');
        console.log(`  ✅ Found ${accounts.length} accounts\n`);

        // ========================================
        // 2.4: Create Sample Invoices
        // ========================================
        console.log('💰 Creating sample invoices...');

        // Invoice 1: Recent Invoice (Open)
        await invoicesService.create({
            customerName: 'Al Futtaim Group',
            date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            dueDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
            currency: Currency.AED,
            items: [
                { description: 'Consulting Services - Q4 2024', quantity: 1, unitPrice: 15000, taxRate: 5 },
                { description: 'Project Management', quantity: 40, unitPrice: 250, taxRate: 5 },
            ],
            notes: 'Payment terms: Net 30 days',
            status: InvoiceStatus.SENT,
        }, demoUser);
        console.log('  ✓ Invoice #1: Al Futtaim Group - AED 26,250.00');

        // Invoice 2: Overdue Invoice
        await invoicesService.create({
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
        console.log('  ✓ Invoice #2: Emaar Properties - AED 11,550.00 (OVERDUE)');

        // Invoice 3: Large Invoice
        await invoicesService.create({
            customerName: 'Carrefour UAE',
            date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
            dueDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
            currency: Currency.AED,
            items: [
                { description: 'Software Development Services', quantity: 80, unitPrice: 300, taxRate: 5 },
                { description: 'Testing & QA', quantity: 20, unitPrice: 200, taxRate: 5 },
            ],
            notes: 'Payment terms: Net 30 days',
            status: InvoiceStatus.SENT,
        }, demoUser);
        console.log('  ✓ Invoice #3: Carrefour UAE - AED 29,400.00');

        // Invoice 4: Draft Invoice
        await invoicesService.create({
            customerName: 'Dubai Holding',
            date: new Date().toISOString(),
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            currency: Currency.AED,
            items: [
                { description: 'Annual Support Contract', quantity: 1, unitPrice: 50000, taxRate: 5 },
            ],
            notes: 'Draft - Pending approval',
            status: InvoiceStatus.DRAFT,
        }, demoUser);
        console.log('  ✓ Invoice #4: Dubai Holding - AED 52,500.00 (DRAFT)');

        // Invoice 5: Multiple Items
        await invoicesService.create({
            customerName: 'Majid Al Futtaim',
            date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
            dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
            currency: Currency.AED,
            items: [
                { description: 'Web Design Services', quantity: 1, unitPrice: 5000, taxRate: 5 },
                { description: 'Mobile App Development', quantity: 1, unitPrice: 12000, taxRate: 5 },
                { description: 'UI/UX Design', quantity: 30, unitPrice: 200, taxRate: 5 },
                { description: 'Hosting & Maintenance (1 year)', quantity: 1, unitPrice: 2400, taxRate: 5 },
            ],
            notes: 'Multi-service package',
            status: InvoiceStatus.SENT,
        }, demoUser);
        console.log('  ✓ Invoice #5: Majid Al Futtaim - AED 25,620.00\n');

        // ========================================
        // 2.5: Create Sample Expenses
        // ========================================
        console.log('💸 Creating sample expenses...');

        await expensesService.create({
            description: 'Office Rent - December 2024',
            amount: 12000,
            taxAmount: 0,
            date: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
            category: 'Rent',
            vendor: 'Emirates Real Estate',
        }, demoUser);
        console.log('  ✓ Expense #1: Office Rent - AED 12,000.00');

        await expensesService.create({
            description: 'DEWA Utilities - November 2024',
            amount: 850,
            taxAmount: 0,
            date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
            category: 'Utilities',
            vendor: 'DEWA',
        }, demoUser);
        console.log('  ✓ Expense #2: DEWA Utilities - AED 850.00');

        await expensesService.create({
            description: 'Etisalat Business Internet',
            amount: 599,
            taxAmount: 0,
            date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
            category: 'Telecommunications',
            vendor: 'Etisalat',
        }, demoUser);
        console.log('  ✓ Expense #3: Etisalat Internet - AED 599.00');

        await expensesService.create({
            description: 'Microsoft 365 Business Subscription',
            amount: 450,
            taxAmount: 0,
            date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
            category: 'Software',
            vendor: 'Microsoft',
        }, demoUser);
        console.log('  ✓ Expense #4: Microsoft 365 - AED 450.00');

        await expensesService.create({
            description: 'Office Supplies - Stationery',
            amount: 320,
            taxAmount: 16,
            date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            category: 'Office Supplies',
            vendor: 'Staples UAE',
        }, demoUser);
        console.log('  ✓ Expense #5: Office Supplies - AED 336.00');

        await expensesService.create({
            description: 'Team Lunch - Client Meeting',
            amount: 280,
            taxAmount: 0,
            date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            category: 'Meals & Entertainment',
            vendor: 'Zuma Dubai',
        }, demoUser);
        console.log('  ✓ Expense #6: Team Lunch - AED 280.00');

        await expensesService.create({
            description: 'Fuel - Company Vehicle',
            amount: 180,
            taxAmount: 0,
            date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            category: 'Transportation',
            vendor: 'ENOC',
        }, demoUser);
        console.log('  ✓ Expense #7: Fuel - AED 180.00\n');

        // ========================================
        // 2.6: Create Journal Entries
        // ========================================
        console.log('📖 Creating journal entries...');

        if (cashAccount) {
            const equityAccount = accounts.find(a => a.name === "Owner's Equity");
            if (equityAccount) {
                await journalEntriesService.create({
                    date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
                    description: 'Opening Balance - Cash',
                    lines: [
                        {
                            accountCode: cashAccount.code,
                            accountName: cashAccount.name,
                            type: 'DEBIT' as any,
                            amount: 100000,
                            description: 'Initial cash balance',
                        },
                        {
                            accountCode: equityAccount.code,
                            accountName: equityAccount.name,
                            type: 'CREDIT' as any,
                            amount: 100000,
                            description: "Owner's capital contribution",
                        },
                    ],
                }, demoUser);
                console.log('  ✓ Journal Entry: Opening Balance - AED 100,000.00\n');
            }
        }

        // ========================================
        // COMPLETION
        // ========================================
        console.log('═══════════════════════════════════════════════');
        console.log('✅ Migration and Seeding Completed Successfully!\n');
        console.log('📊 Summary:');
        console.log('  • Database schema created/updated');
        console.log('  • 2 users created (demo + super admin)');
        console.log('  • 5 sample invoices created');
        console.log('  • 7 sample expenses created');
        console.log('  • 1 journal entry created');
        console.log('  • Chart of accounts initialized\n');
        console.log('═══════════════════════════════════════════════\n');
        console.log('🔐 Login Credentials:\n');
        console.log('Demo User:');
        console.log('  📧 Email: demo@bookkeeping.com');
        console.log('  🔑 Password: Demo123!\n');
        console.log('Super Admin:');
        console.log('  📧 Email: admin@bookkeeping.com');
        console.log('  🔑 Password: Admin123!\n');
        console.log('═══════════════════════════════════════════════\n');

    } catch (error) {
        console.error('❌ Error during migration and seeding:', error);
        throw error;
    } finally {
        await app.close();
    }
}

bootstrap().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
