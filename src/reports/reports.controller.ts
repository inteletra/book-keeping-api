import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
    constructor(private readonly reportsService: ReportsService) { }

    @Get('profit-loss')
    async getProfitLoss(
        @Request() req,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        return this.reportsService.getProfitLoss(req.user, startDate, endDate);
    }

    @Get('dashboard-stats')
    async getDashboardStats(@Request() req) {
        return this.reportsService.getDashboardStats(req.user);
    }

    @Get('balance-sheet')
    async getBalanceSheet(
        @Request() req,
        @Query('asOfDate') asOfDate?: string,
    ) {
        const date = asOfDate ? new Date(asOfDate) : new Date();
        return this.reportsService.getBalanceSheet(req.user, date);
    }
    @Get('cash-flow')
    async getCashFlowStatement(
        @Request() req,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
    ) {
        return this.reportsService.getCashFlowStatement(req.user, startDate, endDate);
    }

    @Get('vat-return')
    async getVatReport(
        @Request() req,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
    ) {
        return this.reportsService.getVatReport(req.user, startDate, endDate);
    }
}
