import { IsString, IsNumber, IsDateString, IsOptional } from 'class-validator';

export class CreateExpenseDto {
    @IsString()
    description: string;

    @IsNumber()
    amount: number;

    @IsNumber()
    @IsOptional()
    taxAmount?: number;

    @IsDateString()
    date: string;

    @IsString()
    @IsOptional()
    category?: string;

    @IsString()
    @IsOptional()
    vendor?: string;
}
