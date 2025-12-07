import { Entity, Column, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Invoice } from './invoice.entity';

@Entity('invoice_items')
export class InvoiceItem extends BaseEntity {
    @Column()
    description: string;

    @Column({ type: 'int' })
    quantity: number;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    unitPrice: number;

    @Column({ type: 'decimal', precision: 5, scale: 2, default: 5.00 })
    taxRate: number; // Standard VAT is 5%

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    amount: number; // quantity * unitPrice

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    taxAmount: number; // amount * (taxRate / 100)

    @ManyToOne(() => Invoice, (invoice) => invoice.items, { onDelete: 'CASCADE' })
    invoice: Invoice;
}
