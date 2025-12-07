import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { VendorBill } from './vendor-bill.entity';
import { Account } from '../../accounts/entities/account.entity';

@Entity('vendor_bill_items')
export class VendorBillItem extends BaseEntity {
    @Column()
    description: string;

    @Column('decimal', { precision: 10, scale: 2 })
    amount: number;

    @Column('decimal', { precision: 5, scale: 2, default: 0 })
    taxRate: number;

    @Column('decimal', { precision: 10, scale: 2, default: 0 })
    taxAmount: number;

    @ManyToOne(() => VendorBill, bill => bill.items, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'billId' })
    bill: VendorBill;

    @Column()
    billId: string;

    @ManyToOne(() => Account)
    @JoinColumn({ name: 'accountId' })
    account: Account;

    @Column()
    accountId: string;
}
