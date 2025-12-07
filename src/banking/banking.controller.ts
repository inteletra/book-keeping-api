import { Controller, Post, Get, Body, Param, UseInterceptors, UploadedFile, UseGuards, Request, Query } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BankingService } from './banking.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';

@Controller('banking')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BankingController {
    constructor(private readonly bankingService: BankingService) { }

    @Post('upload')
    @UseInterceptors(FileInterceptor('file'))
    async uploadStatement(
        @UploadedFile() file: Express.Multer.File,
        @Body('accountId') accountId: string,
        @Request() req,
    ) {
        return this.bankingService.importStatement(accountId, file.buffer, req.user);
    }

    @Get('reconcile/:accountId')
    async getReconciliationData(
        @Param('accountId') accountId: string,
        @Request() req,
    ) {
        return this.bankingService.getReconciliationData(accountId, req.user);
    }

    @Post('match')
    async matchTransaction(
        @Body('bankTxId') bankTxId: string,
        @Body('ledgerEntryId') ledgerEntryId: string,
        @Request() req,
    ) {
        return this.bankingService.matchTransaction(bankTxId, ledgerEntryId, req.user);
    }

    @Post('unmatch')
    async unmatchTransaction(
        @Body('bankTxId') bankTxId: string,
        @Request() req,
    ) {
        return this.bankingService.unmatchTransaction(bankTxId, req.user);
    }
}
