import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AccountsService } from './accounts/accounts.service';
import { CompaniesService } from './companies/companies.service';

async function seedAccounts() {
    const app = await NestFactory.createApplicationContext(AppModule);

    const accountsService = app.get(AccountsService);
    const companiesService = app.get(CompaniesService);

    try {
        // Get all companies
        const companies = await companiesService.findAll();
        console.log(`Found ${companies.length} companies`);

        for (const company of companies) {
            console.log(`Seeding accounts for company: ${company.name} (${company.id})`);
            await accountsService.seedDefaultAccounts(company.id);
            console.log(`✓ Seeded accounts for ${company.name}`);
        }

        console.log('\n✅ All companies seeded successfully!');
    } catch (error) {
        console.error('Error seeding accounts:', error);
    } finally {
        await app.close();
    }
}

seedAccounts();
