import { IsString, IsDateString, IsEnum, IsNumber, ValidateNested, IsOptional, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { InvoiceStatus, Currency } from '@bookkeeping/shared';

export class InvoiceItemDto {
    @IsString()
    description: string;

    @IsNumber()
    quantity: number;

    @IsNumber()
    unitPrice: number;

    @IsNumber()
    taxRate: number;
}

export class CreateInvoiceDto {
    @IsOptional()
    @IsString()
    customerId?: string;

    @IsOptional()
    @IsString()
    customerName?: string;

    @IsDateString()
    date: string;

    @IsDateString()
    dueDate: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => InvoiceItemDto)
    items: InvoiceItemDto[];

    @IsEnum(Currency)
    currency: Currency;

    @IsOptional()
    @IsString()
    notes?: string;

    @IsOptional()
    @IsEnum(InvoiceStatus)
    status?: InvoiceStatus;
}
