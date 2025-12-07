import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './users/entities/user.entity';
import { Company } from './companies/entities/company.entity';
import { Repository } from 'typeorm';
import { AccountsService } from './accounts/accounts.service';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);

    const usersRepository = app.get<Repository<User>>(getRepositoryToken(User));
    const companiesRepository = app.get<Repository<Company>>(getRepositoryToken(Company));
    const accountsService = app.get(AccountsService);

    console.log('Checking for users without companies...');

    const users = await usersRepository.find({
        relations: ['company'],
    });

    const usersWithoutCompany = users.filter(u => !u.company);

    console.log(`Found ${usersWithoutCompany.length} users without companies.`);

    for (const user of usersWithoutCompany) {
        console.log(`Fixing user: ${user.email} (${user.fullName})`);

        // Create a company for the user
        const company = companiesRepository.create({
            name: `${user.fullName}'s Company`,
            address: 'Dubai, UAE',
        });

        await companiesRepository.save(company);
        console.log(`Created company: ${company.name} (${company.id})`);

        // Assign company to user
        user.company = company;
        await usersRepository.save(user);
        console.log(`Assigned company to user.`);

        // Seed default accounts
        console.log('Seeding default accounts...');
        await accountsService.seedDefaultAccounts(company.id);
        console.log('Accounts seeded.');
    }

    console.log('Fix complete!');
    await app.close();
}

bootstrap();
