import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InboxItem, InboxItemStatus } from './entities/inbox-item.entity';
import { User } from '../users/entities/user.entity';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class InboxService {
  constructor(
    @InjectRepository(InboxItem)
    private inboxRepository: Repository<InboxItem>,
  ) {}

  async uploadFile(file: Express.Multer.File, user: User): Promise<InboxItem> {
    // In a real app, upload to S3/GCS. Here we use local storage.
    // Ensure directory exists
    const uploadDir = path.join(process.cwd(), 'uploads', user.company.id);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filename = `${Date.now()}-${file.originalname}`;
    const storagePath = path.join(uploadDir, filename);
    
    fs.writeFileSync(storagePath, file.buffer);

    const item = this.inboxRepository.create({
      originalName: file.originalname,
      storagePath: storagePath,
      mimeType: file.mimetype,
      size: file.size,
      company: user.company,
      status: InboxItemStatus.UPLOADED,
    });

    return this.inboxRepository.save(item);
  }

  async findAll(user: User): Promise<InboxItem[]> {
    return this.inboxRepository.find({
      where: { company: { id: user.company.id } },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, user: User): Promise<InboxItem> {
    const item = await this.inboxRepository.findOne({
      where: { id, company: { id: user.company.id } },
    });
    if (!item) throw new NotFoundException('Inbox item not found');
    return item;
  }

  async delete(id: string, user: User): Promise<void> {
    const item = await this.findOne(id, user);
    // Delete file
    if (fs.existsSync(item.storagePath)) {
      fs.unlinkSync(item.storagePath);
    }
    await this.inboxRepository.remove(item);
  }
}
