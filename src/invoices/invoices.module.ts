import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { Invoice } from './entities/invoice.entity';
import { InvoiceItem } from './entities/invoice-item.entity';
import { LedgerModule } from '../ledger/ledger.module';

import { InvoicePayment } from './entities/invoice-payment.entity';
import { Account } from '../accounts/entities/account.entity';
import { AccountsModule } from '../accounts/accounts.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Invoice, InvoiceItem, InvoicePayment, Account]),
        LedgerModule,
        AccountsModule,
    ],
    controllers: [InvoicesController],
    providers: [InvoicesService],
    exports: [InvoicesService],
})
export class InvoicesModule { }
