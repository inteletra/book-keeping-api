import { Entity, Column, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Company } from '../../companies/entities/company.entity';
import { InvoiceItem } from './invoice-item.entity';
import { InvoicePayment } from './invoice-payment.entity';
import { InvoiceStatus, Currency } from '@bookkeeping/shared';

@Entity('invoices')
export class Invoice extends BaseEntity {
    @Column()
    invoiceNumber: string; // e.g., INV-001

    @Column({ type: 'date', nullable: true })
    date: Date;

    @Column({ type: 'date', nullable: true })
    dueDate: Date;

    @Column({
        type: 'enum',
        enum: InvoiceStatus,
        default: InvoiceStatus.DRAFT,
    })
    status: InvoiceStatus;

    @Column({ nullable: true })
    customerName: string; // For simplicity, storing name directly for now

    @Column({ nullable: true })
    customerEmail: string;

    @Column({ nullable: true })
    customerTRN: string; // Tax Registration Number for VAT invoices

    @Column({
        type: 'enum',
        enum: Currency,
        default: Currency.AED,
    })
    currency: Currency;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    subtotal: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    taxTotal: number; // VAT Amount

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    total: number;

    @Column({ type: 'text', nullable: true })
    notes: string;

    @ManyToOne(() => Company, (company) => company.invoices)
    company: Company;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    amountPaid: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    balanceDue: number;

    @OneToMany(() => InvoiceItem, (item) => item.invoice, { cascade: true })
    items: InvoiceItem[];

    @OneToMany(() => InvoicePayment, (payment) => payment.invoice, { cascade: true })
    payments: InvoicePayment[];
}
