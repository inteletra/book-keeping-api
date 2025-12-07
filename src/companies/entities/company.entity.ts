import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Invoice } from '../../invoices/entities/invoice.entity';

@Entity('companies')
export class Company extends BaseEntity {
    @Column()
    name: string;

    @Column({ nullable: true })
    address: string;

    @Column({ nullable: true })
    phone: string;

    @Column({ nullable: true })
    email: string;

    @Column({ nullable: true })
    logoUrl: string;

    @Column({ nullable: true })
    primaryColor: string;

    @Column({ nullable: true })
    secondaryColor: string;

    @Column({ type: 'text', nullable: true })
    invoiceFooter: string;

    @OneToMany(() => User, (user) => user.company)
    users: User[];

    @OneToMany(() => Invoice, (invoice) => invoice.company)
    invoices: Invoice[];

    @Column({ nullable: true })
    defaultExpenseAccountId: string;

    @Column({ nullable: true })
    defaultIncomeAccountId: string;
}
