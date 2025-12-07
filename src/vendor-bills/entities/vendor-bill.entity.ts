import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Company } from '../../companies/entities/company.entity';
import { VendorBillItem } from './vendor-bill-item.entity';

export enum VendorBillStatus {
    DRAFT = 'DRAFT',
    OPEN = 'OPEN',
    PAID = 'PAID',
    VOID = 'VOID',
}

@Entity('vendor_bills')
export class VendorBill extends BaseEntity {
    @Column()
    billNumber: string;

    @Column({ nullable: true })
    vendorName: string; // Storing name for now, later relation to Contact

    @Column({ type: 'date' })
    issueDate: Date;

    @Column({ type: 'date' })
    dueDate: Date;

    @Column({
        type: 'enum',
        enum: VendorBillStatus,
        default: VendorBillStatus.DRAFT,
    })
    status: VendorBillStatus;

    @Column('decimal', { precision: 10, scale: 2, default: 0 })
    totalAmount: number;

    @Column('decimal', { precision: 10, scale: 2, default: 0 })
    taxAmount: number;

    @OneToMany(() => VendorBillItem, item => item.bill, { cascade: true })
    items: VendorBillItem[];

    @ManyToOne(() => Company)
    @JoinColumn({ name: 'companyId' })
    company: Company;

    @Column()
    companyId: string;
}
