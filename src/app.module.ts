import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { CompaniesModule } from './companies/companies.module';
import { InvoicesModule } from './invoices/invoices.module';
import { ExpensesModule } from './expenses/expenses.module';
import { AuthModule } from './auth/auth.module';
import { AiModule } from './ai/ai.module';
import { OcrModule } from './ocr/ocr.module';
import { CurrencyModule } from './common/services/currency.module';
import { AuditModule } from './audit/audit.module';
import { InboxModule } from './inbox/inbox.module';
import { JournalEntriesModule } from './journal-entries/journal-entries.module';
import { AccountsModule } from './accounts/accounts.module';
import { LedgerModule } from './ledger/ledger.module';
import { ReportsModule } from './reports/reports.module';
import { BankingModule } from './banking/banking.module';
import { VendorBillsModule } from './vendor-bills/vendor-bills.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DATABASE_HOST'),
        port: configService.get<number>('DATABASE_PORT'),
        username: configService.get<string>('DATABASE_USER'),
        password: configService.get<string>('DATABASE_PASSWORD'),
        database: configService.get<string>('DATABASE_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true,
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    CompaniesModule,
    InvoicesModule,
    ExpensesModule,
    AuthModule,
    AiModule,
    OcrModule,
    CurrencyModule,
    AuditModule,
    InboxModule,
    JournalEntriesModule,
    AccountsModule,
    LedgerModule,
    ReportsModule,
    BankingModule,
    VendorBillsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
