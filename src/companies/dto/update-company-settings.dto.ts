import { IsString, IsOptional } from 'class-validator';

export class UpdateCompanySettingsDto {
    @IsString()
    @IsOptional()
    logoUrl?: string;

    @IsString()
    @IsOptional()
    primaryColor?: string;

    @IsString()
    @IsOptional()
    secondaryColor?: string;

    @IsString()
    @IsOptional()
    invoiceFooter?: string;
}
