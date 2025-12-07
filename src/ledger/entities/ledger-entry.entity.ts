import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Account } from '../../accounts/entities/account.entity';
import { Company } from '../../companies/entities/company.entity';
import { User } from '../../users/entities/user.entity';
import { LedgerSourceType } from '@bookkeeping/shared';

@Entity('ledger_entries')
export class LedgerEntry extends BaseEntity {
    @ManyToOne(() => Account)
    @JoinColumn({ name: 'accountId' })
    account: Account;

    @Column()
    accountId: string;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    debit: number;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    credit: number;

    @Column({ type: 'date' })
    date: Date;

    @Column()
    description: string;

    @Column({ nullable: true })
    reference: string; // e.g., "INV-00001", "EXP-00001"

    @Column({
        type: 'enum',
        enum: LedgerSourceType,
    })
    sourceType: LedgerSourceType;

    @Column({ nullable: true })
    sourceId: string; // ID of the source transaction

    @ManyToOne(() => Company)
    @JoinColumn({ name: 'companyId' })
    company: Company;

    @Column()
    companyId: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'postedById' })
    postedBy: User;

    @Column()
    postedById: string;
}
