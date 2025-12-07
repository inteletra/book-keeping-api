import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LedgerService } from './ledger.service';
import { LedgerController } from './ledger.controller';
import { LedgerEntry } from './entities/ledger-entry.entity';
import { Account } from '../accounts/entities/account.entity';

@Module({
    imports: [TypeOrmModule.forFeature([LedgerEntry, Account])],
    controllers: [LedgerController],
    providers: [LedgerService],
    exports: [LedgerService],
})
export class LedgerModule { }
