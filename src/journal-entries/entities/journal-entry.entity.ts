import { Entity, Column, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Company } from '../../companies/entities/company.entity';
import { JournalLine } from './journal-line.entity';

export enum JournalEntryStatus {
    DRAFT = 'DRAFT',
    POSTED = 'POSTED',
    VOID = 'VOID',
}

@Entity('journal_entries')
export class JournalEntry extends BaseEntity {
    @Column()
    entryNumber: string;

    @Column({ type: 'date' })
    date: Date;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({
        type: 'enum',
        enum: JournalEntryStatus,
        default: JournalEntryStatus.DRAFT,
    })
    status: JournalEntryStatus;

    @Column({ type: 'text', nullable: true })
    reference: string;

    @ManyToOne(() => Company, { onDelete: 'CASCADE' })
    company: Company;

    @OneToMany(() => JournalLine, (line) => line.journalEntry, { cascade: true })
    lines: JournalLine[];
}
