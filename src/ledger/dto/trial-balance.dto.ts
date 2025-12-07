import { IsOptional, IsDateString } from 'class-validator';

export interface TrialBalanceEntry {
    accountCode: string;
    accountName: string;
    accountType: string;
    debit: number;
    credit: number;
}

export class TrialBalanceQueryDto {
    @IsOptional()
    @IsDateString()
    asOfDate?: string; // Defaults to today if not provided
}
