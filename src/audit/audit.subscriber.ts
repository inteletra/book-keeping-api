import {
    EventSubscriber,
    EntitySubscriberInterface,
    InsertEvent,
    UpdateEvent,
    RemoveEvent,
    DataSource,
} from 'typeorm';
import { Injectable } from '@nestjs/common';
import { AuditService } from './audit.service';
import { Invoice } from '../invoices/entities/invoice.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
@EventSubscriber()
export class AuditSubscriber implements EntitySubscriberInterface {
    constructor(
        dataSource: DataSource,
        private readonly auditService: AuditService,
    ) {
        dataSource.subscribers.push(this);
    }

    listenTo() {
        return 'everything'; // Listen to all entities, filter in methods
    }

    async afterInsert(event: InsertEvent<any>) {
        if (this.shouldLog(event.entity)) {
            await this.logChange('CREATE', event.entity);
        }
    }

    async afterUpdate(event: UpdateEvent<any>) {
        if (this.shouldLog(event.entity)) {
            await this.logChange('UPDATE', event.entity);
        }
    }

    async afterRemove(event: RemoveEvent<any>) {
        if (this.shouldLog(event.entity)) {
            await this.logChange('DELETE', event.entity);
        }
    }

    private shouldLog(entity: any): boolean {
        return entity instanceof Invoice || entity instanceof User;
    }

    private async logChange(action: string, entity: any) {
        // In a real app, we'd get the current user from a request context (CLS/ALS)
        // For now, we'll log 'SYSTEM' or try to extract if possible
        const userId = 'SYSTEM';
        const entityType = entity.constructor.name;
        const entityId = entity.id;

        await this.auditService.log(action, entityType, entityId, userId, entity);
    }
}
