import {
    Controller,
    Get,
    Post,
    Delete,
    Patch,
    Body,
    Param,
    UseGuards,
    Request
} from '@nestjs/common';
import { JournalEntriesService } from './journal-entries.service';
import { CreateJournalEntryDto } from './dto/create-journal-entry.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';

@Controller('journal-entries')
@UseGuards(JwtAuthGuard, RolesGuard)
export class JournalEntriesController {
    constructor(private readonly journalEntriesService: JournalEntriesService) { }

    @Post()
    create(@Body() createDto: CreateJournalEntryDto, @Request() req) {
        return this.journalEntriesService.create(createDto, req.user);
    }

    @Get()
    findAll(@Request() req) {
        return this.journalEntriesService.findAll(req.user);
    }

    @Get(':id')
    findOne(@Param('id') id: string, @Request() req) {
        return this.journalEntriesService.findOne(id, req.user);
    }

    @Patch(':id/post')
    post(@Param('id') id: string, @Request() req) {
        return this.journalEntriesService.post(id, req.user);
    }

    @Patch(':id/void')
    void(@Param('id') id: string, @Request() req) {
        return this.journalEntriesService.void(id, req.user);
    }

    @Delete(':id')
    delete(@Param('id') id: string, @Request() req) {
        return this.journalEntriesService.delete(id, req.user);
    }
}
