import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JournalEntriesService } from './journal-entries.service';
import { JournalEntriesController } from './journal-entries.controller';
import { JournalEntry } from './entities/journal-entry.entity';
import { JournalLine } from './entities/journal-line.entity';
import { LedgerModule } from '../ledger/ledger.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([JournalEntry, JournalLine]),
        LedgerModule,
    ],
    controllers: [JournalEntriesController],
    providers: [JournalEntriesService],
    exports: [JournalEntriesService],
})
export class JournalEntriesModule { }
