import { Controller, Get, Query, Param, UseGuards, Request } from '@nestjs/common';
import { LedgerService } from './ledger.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { LedgerFilters } from './dto/ledger.dto';
import { TrialBalanceQueryDto } from './dto/trial-balance.dto';

@Controller('ledger')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LedgerController {
    constructor(private readonly ledgerService: LedgerService) { }

    @Get()
    getEntries(@Query() filters: LedgerFilters, @Request() req) {
        return this.ledgerService.getEntries(filters, req.user);
    }

    @Get('trial-balance')
    getTrialBalance(@Query() query: TrialBalanceQueryDto, @Request() req) {
        const asOfDate = query.asOfDate ? new Date(query.asOfDate) : new Date();
        return this.ledgerService.getTrialBalance(asOfDate, req.user);
    }

    @Get('account/:accountId')
    getAccountLedger(@Param('accountId') accountId: string, @Request() req) {
        return this.ledgerService.getAccountLedger(accountId, req.user);
    }
}
