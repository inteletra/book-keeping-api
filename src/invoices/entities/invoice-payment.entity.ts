import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Invoice } from './invoice.entity';
import { Account } from '../../accounts/entities/account.entity';

@Entity('invoice_payments')
export class InvoicePayment extends BaseEntity {
    @Column('decimal', { precision: 10, scale: 2 })
    amount: number;

    @Column({ type: 'date' })
    date: Date;

    @Column()
    method: string; // Cash, Bank Transfer, Cheque, etc.

    @Column({ nullable: true })
    reference: string;

    @ManyToOne(() => Invoice, invoice => invoice.payments, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'invoiceId' })
    invoice: Invoice;

    @Column()
    invoiceId: string;

    @ManyToOne(() => Account)
    @JoinColumn({ name: 'accountId' })
    account: Account; // The asset account receiving the money (Bank/Cash)

    @Column()
    accountId: string;
}
