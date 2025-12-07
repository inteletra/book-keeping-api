import { Entity, Column, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Company } from '../../companies/entities/company.entity';
import { UserRole } from '@bookkeeping/shared';

@Entity('users')
export class User extends BaseEntity {
    @Column({ unique: true })
    email: string;

    @Column()
    passwordHash: string;

    @Column()
    fullName: string;

    @Column({
        type: 'enum',
        enum: UserRole,
        default: UserRole.USER,
        nullable: true
    })
    role: UserRole;

    @ManyToOne(() => Company, (company) => company.users, { nullable: true })
    company: Company;
}
