import { IsString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { AccountType, AccountSubType, CreateAccountDto as ICreateAccountDto } from '@bookkeeping/shared';

export class CreateAccountDto implements ICreateAccountDto {
    @IsString()
    code: string;

    @IsString()
    name: string;

    @IsEnum(AccountType)
    type: AccountType;

    @IsEnum(AccountSubType)
    subType: AccountSubType;

    @IsOptional()
    @IsUUID()
    parentId?: string;

    @IsOptional()
    @IsString()
    currency?: string;

    @IsOptional()
    @IsString()
    description?: string;
}

