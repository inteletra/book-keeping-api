import { Entity, Column, ManyToOne, OneToMany, JoinColumn, Unique } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Company } from '../../companies/entities/company.entity';
import { AccountType, AccountSubType } from '@bookkeeping/shared';

@Entity('accounts')
@Unique(['code', 'company'])
export class Account extends BaseEntity {
    @Column()
    code: string; // e.g., "1000", "1100"

    @Column()
    name: string; // e.g., "Cash", "Accounts Receivable"

    @Column({
        type: 'enum',
        enum: AccountType,
    })
    type: AccountType; // ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE

    @Column({
        type: 'enum',
        enum: AccountSubType,
    })
    subType: AccountSubType; // CURRENT_ASSET, FIXED_ASSET, etc.

    @Column({ nullable: true })
    parentId: string;

    @ManyToOne(() => Account, { nullable: true })
    @JoinColumn({ name: 'parentId' })
    parent: Account;

    @OneToMany(() => Account, account => account.parent)
    children: Account[];

    @ManyToOne(() => Company)
    company: Company;

    @Column({ default: 'AED' })
    currency: string;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    balance: number;

    @Column({ default: true })
    isActive: boolean;

    @Column({ default: false })
    isSystem: boolean; // System accounts cannot be deleted

    @Column({ nullable: true })
    description: string;
}
