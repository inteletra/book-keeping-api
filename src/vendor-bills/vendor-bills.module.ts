import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VendorBillsService } from './vendor-bills.service';
import { VendorBillsController } from './vendor-bills.controller';
import { VendorBill } from './entities/vendor-bill.entity';
import { VendorBillItem } from './entities/vendor-bill-item.entity';
import { LedgerModule } from '../ledger/ledger.module';
import { AccountsModule } from '../accounts/accounts.module';
import { Account } from '../accounts/entities/account.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([VendorBill, VendorBillItem, Account]),
        LedgerModule,
        AccountsModule,
    ],
    controllers: [VendorBillsController],
    providers: [VendorBillsService],
    exports: [VendorBillsService],
})
export class VendorBillsModule { }
