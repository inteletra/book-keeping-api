import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JournalEntry, JournalEntryStatus } from './entities/journal-entry.entity';
import { JournalLine, LineType } from './entities/journal-line.entity';
import { CreateJournalEntryDto } from './dto/create-journal-entry.dto';
import { User } from '../users/entities/user.entity';
import { LedgerService } from '../ledger/ledger.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class JournalEntriesService {
    constructor(
        @InjectRepository(JournalEntry)
        private journalEntriesRepository: Repository<JournalEntry>,
        @InjectRepository(JournalLine)
        private journalLinesRepository: Repository<JournalLine>,
        private ledgerService: LedgerService,
        private auditService: AuditService,
    ) { }

    async create(createDto: CreateJournalEntryDto, user: User): Promise<JournalEntry> {
        // Validate debits = credits
        const totalDebit = createDto.lines
            .filter(l => l.type === LineType.DEBIT)
            .reduce((sum, l) => sum + Number(l.amount), 0);

        const totalCredit = createDto.lines
            .filter(l => l.type === LineType.CREDIT)
            .reduce((sum, l) => sum + Number(l.amount), 0);

        if (Math.abs(totalDebit - totalCredit) > 0.01) {
            throw new BadRequestException('Debits must equal credits');
        }

        // Generate entry number
        const count = await this.journalEntriesRepository.count({
            where: { company: { id: user.company.id } },
        });
        const entryNumber = `JE - ${String(count + 1).padStart(5, '0')} `;

        // Create journal entry
        const entry = this.journalEntriesRepository.create({
            entryNumber,
            date: createDto.date,
            description: createDto.description,
            reference: createDto.reference,
            company: user.company,
            status: JournalEntryStatus.DRAFT,
        });

        const savedEntry = await this.journalEntriesRepository.save(entry);

        // Create journal lines
        const lines: JournalLine[] = [];
        for (const lineDto of createDto.lines) {
            const line = this.journalLinesRepository.create({
                journalEntry: savedEntry,
                accountCode: lineDto.accountCode,
                accountName: lineDto.accountName,
                type: lineDto.type,
                amount: lineDto.amount,
                description: lineDto.description,
            });

            lines.push(await this.journalLinesRepository.save(line));
        }

        savedEntry.lines = lines;

        // Audit log
        await this.auditService.log(
            'CREATE',
            'JournalEntry',
            savedEntry.id,
            user.id,
            { entryNumber: savedEntry.entryNumber, description: savedEntry.description }
        );

        return savedEntry;
    }

    async findAll(user: User): Promise<JournalEntry[]> {
        return this.journalEntriesRepository.find({
            where: { company: { id: user.company.id } },
            relations: ['lines'],
            order: { date: 'DESC', entryNumber: 'DESC' },
        });
    }

    async findOne(id: string, user: User): Promise<JournalEntry> {
        const entry = await this.journalEntriesRepository.findOne({
            where: { id, company: { id: user.company.id } },
            relations: ['lines'],
        });

        if (!entry) {
            throw new NotFoundException('Journal entry not found');
        }

        return entry;
    }

    async post(id: string, user: User): Promise<JournalEntry> {
        const entry = await this.findOne(id, user);
        if (entry.status !== JournalEntryStatus.DRAFT) {
            throw new BadRequestException('Only draft entries can be posted');
        }
        entry.status = JournalEntryStatus.POSTED;
        const savedEntry = await this.journalEntriesRepository.save(entry);

        // Post to ledger
        await this.ledgerService.postJournalEntryToLedger(savedEntry, user);

        // Audit log
        await this.auditService.log(
            'UPDATE',
            'JournalEntry',
            savedEntry.id,
            user.id,
            { action: 'POSTED', entryNumber: savedEntry.entryNumber }
        );

        return savedEntry;
    }

    async void(id: string, user: User): Promise<JournalEntry> {
        const entry = await this.findOne(id, user);

        if (entry.status === JournalEntryStatus.VOID) {
            throw new BadRequestException('Entry is already void');
        }

        entry.status = JournalEntryStatus.VOID;
        const voidedEntry = await this.journalEntriesRepository.save(entry);

        // Audit log
        await this.auditService.log(
            'UPDATE',
            'JournalEntry',
            voidedEntry.id,
            user.id,
            { action: 'VOIDED', entryNumber: voidedEntry.entryNumber }
        );

        return voidedEntry;
    }

    async delete(id: string, user: User): Promise<void> {
        const entry = await this.findOne(id, user);

        if (entry.status === JournalEntryStatus.POSTED) {
            throw new BadRequestException('Cannot delete posted entries. Void them instead.');
        }

        // Audit log before deletion
        await this.auditService.log(
            'DELETE',
            'JournalEntry',
            entry.id,
            user.id,
            { entryNumber: entry.entryNumber, description: entry.description }
        );

        await this.journalEntriesRepository.remove(entry);
    }
}
