import { Entity, Column, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { JournalEntry } from './journal-entry.entity';

export enum LineType {
    DEBIT = 'DEBIT',
    CREDIT = 'CREDIT',
}

@Entity('journal_lines')
export class JournalLine extends BaseEntity {
    @ManyToOne(() => JournalEntry, (entry) => entry.lines, { onDelete: 'CASCADE' })
    journalEntry: JournalEntry;

    @Column()
    accountCode: string;

    @Column()
    accountName: string;

    @Column({
        type: 'enum',
        enum: LineType,
    })
    type: LineType;

    @Column({ type: 'decimal', precision: 15, scale: 2 })
    amount: number;

    @Column({ type: 'text', nullable: true })
    description: string;
}
