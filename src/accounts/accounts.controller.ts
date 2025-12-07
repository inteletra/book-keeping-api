import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseGuards,
    Request,
} from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { AccountType } from '@bookkeeping/shared';

@Controller('accounts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AccountsController {
    constructor(private readonly accountsService: AccountsService) { }

    @Post()
    create(@Body() createAccountDto: CreateAccountDto, @Request() req) {
        return this.accountsService.create(createAccountDto, req.user);
    }

    @Get()
    findAll(@Request() req) {
        return this.accountsService.findAll(req.user);
    }

    @Get('hierarchy')
    getHierarchy(@Request() req) {
        return this.accountsService.getHierarchy(req.user);
    }

    @Get('type/:type')
    findByType(@Param('type') type: AccountType, @Request() req) {
        return this.accountsService.findByType(type, req.user);
    }

    @Get(':id')
    findOne(@Param('id') id: string, @Request() req) {
        return this.accountsService.findOne(id, req.user);
    }

    @Patch(':id')
    update(
        @Param('id') id: string,
        @Body() updateAccountDto: UpdateAccountDto,
        @Request() req,
    ) {
        return this.accountsService.update(id, updateAccountDto, req.user);
    }

    @Delete(':id')
    remove(@Param('id') id: string, @Request() req) {
        return this.accountsService.remove(id, req.user);
    }
}
