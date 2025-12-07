import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Account } from '../../accounts/entities/account.entity';
import { LedgerEntry } from '../../ledger/entities/ledger-entry.entity';

export enum BankTransactionStatus {
    PENDING = 'PENDING',
    MATCHED = 'MATCHED',
}

@Entity('bank_transactions')
export class BankTransaction extends BaseEntity {
    @Column({ type: 'date' })
    date: Date;

    @Column()
    description: string;

    @Column('decimal', { precision: 10, scale: 2 })
    amount: number; // Positive for deposit, Negative for withdrawal

    @Column({ nullable: true })
    reference: string;

    @Column({
        type: 'enum',
        enum: BankTransactionStatus,
        default: BankTransactionStatus.PENDING,
    })
    status: BankTransactionStatus;

    @ManyToOne(() => Account)
    @JoinColumn({ name: 'accountId' })
    account: Account; // The bank account in our system

    @Column()
    accountId: string;

    @ManyToOne(() => LedgerEntry, { nullable: true })
    @JoinColumn({ name: 'matchedLedgerEntryId' })
    matchedLedgerEntry: LedgerEntry;

    @Column({ nullable: true })
    matchedLedgerEntryId: string | null;
}
