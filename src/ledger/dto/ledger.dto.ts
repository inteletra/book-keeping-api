import { IsString, IsNumber, IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { LedgerSourceType } from '@bookkeeping/shared';

export class CreateLedgerEntryDto {
    @IsUUID()
    accountId: string;

    @IsNumber()
    debit: number;

    @IsNumber()
    credit: number;

    @IsDateString()
    date: string;

    @IsString()
    description: string;

    @IsOptional()
    @IsString()
    reference?: string;

    @IsEnum(LedgerSourceType)
    sourceType: LedgerSourceType;

    @IsOptional()
    @IsUUID()
    sourceId?: string;
}

export interface LedgerFilters {
    accountId?: string;
    dateFrom?: string;
    dateTo?: string;
    sourceType?: LedgerSourceType;
}
