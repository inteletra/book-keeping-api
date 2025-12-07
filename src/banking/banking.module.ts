import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BankingService } from './banking.service';
import { BankingController } from './banking.controller';
import { BankTransaction } from './entities/bank-transaction.entity';
import { LedgerEntry } from '../ledger/entities/ledger-entry.entity';
import { Account } from '../accounts/entities/account.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([BankTransaction, LedgerEntry, Account]),
    ],
    controllers: [BankingController],
    providers: [BankingService],
    exports: [BankingService],
})
export class BankingModule { }
