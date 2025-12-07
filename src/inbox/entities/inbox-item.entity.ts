import { Entity, Column, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Company } from '../../companies/entities/company.entity';

export enum InboxItemStatus {
  UPLOADED = 'UPLOADED',
  PROCESSING = 'PROCESSING',
  READY = 'READY',
  FAILED = 'FAILED',
  CONVERTED = 'CONVERTED',
}

export enum InboxItemType {
  RECEIPT = 'RECEIPT',
  INVOICE = 'INVOICE',
  OTHER = 'OTHER',
}

@Entity('inbox_items')
export class InboxItem extends BaseEntity {
  @Column()
  originalName: string;

  @Column()
  storagePath: string;

  @Column()
  mimeType: string;

  @Column({ type: 'bigint' })
  size: number;

  @Column({
    type: 'enum',
    enum: InboxItemStatus,
    default: InboxItemStatus.UPLOADED,
  })
  status: InboxItemStatus;

  @Column({
    type: 'enum',
    enum: InboxItemType,
    default: InboxItemType.OTHER,
  })
  type: InboxItemType;

  @Column({ type: 'jsonb', nullable: true })
  detectedData: any;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  company: Company;
}
