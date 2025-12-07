import { Controller, Get, Post, Delete, Patch, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ExpenseStatus } from './entities/expense.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('expenses')
@UseGuards(JwtAuthGuard)
export class ExpensesController {
    constructor(private readonly expensesService: ExpensesService) { }

    @Post()
    create(@Body() createExpenseDto: CreateExpenseDto, @Request() req) {
        return this.expensesService.create(createExpenseDto, req.user);
    }

    @Get()
    findAll(@Query() pagination: any, @Request() req) {
        return this.expensesService.findAll(pagination, req.user);
    }

    @Get(':id')
    findOne(@Param('id') id: string, @Request() req) {
        return this.expensesService.findOne(id, req.user);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateData: Partial<CreateExpenseDto>, @Request() req) {
        return this.expensesService.update(id, updateData, req.user);
    }

    @Patch(':id/status')
    updateStatus(@Param('id') id: string, @Body('status') status: ExpenseStatus, @Request() req) {
        return this.expensesService.updateStatus(id, status, req.user);
    }

    @Delete(':id')
    remove(@Param('id') id: string, @Request() req) {
        return this.expensesService.remove(id, req.user);
    }
}
