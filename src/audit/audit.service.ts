import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

@Injectable()
export class AuditService {
    constructor(
        @InjectRepository(AuditLog)
        private auditRepository: Repository<AuditLog>,
    ) { }

    async log(action: string, entityType: string, entityId: string, userId: string, details?: any) {
        const log = this.auditRepository.create({
            action,
            entityType,
            entityId,
            userId,
            details,
        });
        return this.auditRepository.save(log);
    }

    async findAll() {
        return this.auditRepository.find({
            order: { createdAt: 'DESC' },
            relations: ['user'],
            take: 100, // Limit to last 100 logs
        });
    }
}
