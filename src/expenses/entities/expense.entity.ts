import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Company } from '../../companies/entities/company.entity';

export enum ExpenseStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
    PAID = 'PAID',
}

@Entity('expenses')
export class Expense extends BaseEntity {
    @Column()
    description: string;

    @Column('decimal', { precision: 10, scale: 2 })
    amount: number;

    @Column('decimal', { precision: 10, scale: 2, default: 0 })
    taxAmount: number;

    @Column({ type: 'date' })
    date: Date;

    @Column({ nullable: true })
    category: string;

    @Column({ nullable: true })
    vendor: string;

    @Column({
        type: 'enum',
        enum: ExpenseStatus,
        default: ExpenseStatus.PENDING,
    })
    status: ExpenseStatus;

    @ManyToOne(() => Company)
    @JoinColumn({ name: 'companyId' })
    company: Company;
}
