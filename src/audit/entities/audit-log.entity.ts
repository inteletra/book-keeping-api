import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';

@Entity('audit_logs')
export class AuditLog extends BaseEntity {
    @Column()
    action: string; // CREATE, UPDATE, DELETE, LOGIN, etc.

    @Column()
    entityType: string; // Invoice, Expense, User, etc.

    @Column({ nullable: true })
    entityId: string;

    @Column('jsonb', { nullable: true })
    details: any; // Changed values, metadata, etc.

    @Column({ nullable: true })
    userId: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'userId' })
    user: User;
}
