import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Expense, ExpenseStatus } from './entities/expense.entity';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { User } from '../users/entities/user.entity';
import { LedgerService } from '../ledger/ledger.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ExpensesService {
    constructor(
        @InjectRepository(Expense)
        private expensesRepository: Repository<Expense>,
        private ledgerService: LedgerService,
        private auditService: AuditService,
    ) { }

    async create(createExpenseDto: CreateExpenseDto, user: User): Promise<Expense> {
        const expense = this.expensesRepository.create({
            ...createExpenseDto,
            company: user.company,
        });
        const savedExpense = await this.expensesRepository.save(expense);

        // Post to ledger immediately
        await this.ledgerService.postExpenseToLedger(savedExpense, user);

        // Audit log
        await this.auditService.log(
            'CREATE',
            'Expense',
            savedExpense.id,
            user.id,
            { description: savedExpense.description, amount: savedExpense.amount }
        );

        return savedExpense;
    }

    async findAll(pagination: any = {}, user: User): Promise<any> {
        const { page, limit, sortBy = 'date', sortOrder = 'DESC' } = pagination;

        // If no pagination params, return all (backward compatible)
        if (!page && !limit) {
            return this.expensesRepository.find({
                where: { company: { id: user.company.id } },
                order: { [sortBy]: sortOrder },
            });
        }

        // With pagination
        const skip = ((page || 1) - 1) * (limit || 10);
        const take = limit || 10;

        const [data, total] = await this.expensesRepository.findAndCount({
            where: { company: { id: user.company.id } },
            order: { [sortBy]: sortOrder },
            skip,
            take,
        });

        return {
            data,
            meta: {
                total,
                page: page || 1,
                limit: limit || 10,
                totalPages: Math.ceil(total / (limit || 10)),
            },
        };
    }

    async findOne(id: string, user: User): Promise<Expense> {
        const expense = await this.expensesRepository.findOne({
            where: { id, company: { id: user.company.id } },
        });

        if (!expense) {
            throw new NotFoundException(`Expense #${id} not found`);
        }

        return expense;
    }

    async update(id: string, updateData: Partial<CreateExpenseDto>, user: User): Promise<Expense> {
        const expense = await this.findOne(id, user);
        Object.assign(expense, updateData);
        return this.expensesRepository.save(expense);
    }

    async updateStatus(id: string, status: ExpenseStatus, user: User): Promise<Expense> {
        const expense = await this.findOne(id, user);
        expense.status = status;
        return this.expensesRepository.save(expense);
    }

    async remove(id: string, user: User): Promise<void> {
        await this.expensesRepository.delete({
            id,
            company: { id: user.company.id },
        });
    }
}
