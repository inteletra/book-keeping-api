import { IsString, IsDate, IsArray, ValidateNested, IsOptional, IsEnum, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { LineType } from '../entities/journal-line.entity';

export class CreateJournalLineDto {
    @IsString()
    accountCode: string;

    @IsString()
    accountName: string;

    @IsEnum(LineType)
    type: LineType;

    @IsNumber()
    amount: number;

    @IsString()
    @IsOptional()
    description?: string;
}

export class CreateJournalEntryDto {
    @IsDate()
    @Type(() => Date)
    date: Date;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    reference?: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateJournalLineDto)
    lines: CreateJournalLineDto[];
}
