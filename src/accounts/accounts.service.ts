import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account } from './entities/account.entity';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { User } from '../users/entities/user.entity';
import { AccountType, AccountSubType } from '@bookkeeping/shared';
import { Company } from '../companies/entities/company.entity';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AccountsService {
    constructor(
        @InjectRepository(Account)
        private accountsRepository: Repository<Account>,
        private auditService: AuditService,
    ) { }

    async create(createDto: CreateAccountDto, user: User): Promise<Account> {
        // Validate account code uniqueness within company
        const existing = await this.accountsRepository.findOne({
            where: { code: createDto.code, company: { id: user.company.id } },
        });

        if (existing) {
            throw new BadRequestException('Account code already exists');
        }

        // Validate parent account exists if parentId provided
        if (createDto.parentId) {
            const parent = await this.accountsRepository.findOne({
                where: { id: createDto.parentId, company: { id: user.company.id } },
            });

            if (!parent) {
                throw new NotFoundException('Parent account not found');
            }
        }

        const account = this.accountsRepository.create({
            ...createDto,
            company: user.company,
        });

        const savedAccount = await this.accountsRepository.save(account);

        // Audit log
        await this.auditService.log(
            'CREATE',
            'Account',
            savedAccount.id,
            user.id,
            { code: savedAccount.code, name: savedAccount.name }
        );

        return savedAccount;
    }

    async findAll(user: User): Promise<Account[]> {
        return this.accountsRepository.find({
            where: { company: { id: user.company.id } },
            relations: ['parent', 'children'],
            order: { code: 'ASC' },
        });
    }

    async findOne(id: string, user: User): Promise<Account> {
        const account = await this.accountsRepository.findOne({
            where: { id, company: { id: user.company.id } },
            relations: ['parent', 'children'],
        });

        if (!account) {
            throw new NotFoundException('Account not found');
        }

        return account;
    }

    async findByType(type: AccountType, user: User): Promise<Account[]> {
        return this.accountsRepository.find({
            where: {
                company: { id: user.company.id },
                type,
                isActive: true,
            },
            order: { code: 'ASC' },
        });
    }

    async getHierarchy(user: User): Promise<Account[]> {
        const accounts = await this.findAll(user);
        return this.buildHierarchy(accounts);
    }

    private buildHierarchy(accounts: Account[]): Account[] {
        const map = new Map<string, Account>();
        const roots: Account[] = [];

        // Create a map of all accounts
        accounts.forEach(account => {
            map.set(account.id, { ...account, children: [] });
        });

        // Build the hierarchy
        accounts.forEach(account => {
            const node = map.get(account.id);
            if (!node) return;

            if (account.parentId) {
                const parent = map.get(account.parentId);
                if (parent) {
                    if (!parent.children) {
                        parent.children = [];
                    }
                    parent.children.push(node);
                }
            } else {
                roots.push(node);
            }
        });

        return roots;
    }

    async update(id: string, updateDto: UpdateAccountDto, user: User): Promise<Account> {
        const account = await this.findOne(id, user);

        // Prevent updating system accounts' critical fields
        if (account.isSystem && ('code' in updateDto || 'type' in updateDto)) {
            throw new BadRequestException('Cannot modify code or type of system accounts');
        }

        // Validate code uniqueness if changing code
        if ('code' in updateDto && updateDto.code && updateDto.code !== account.code) {
            const existing = await this.accountsRepository.findOne({
                where: { code: updateDto.code as string, company: { id: user.company.id } },
            });

            if (existing) {
                throw new BadRequestException('Account code already exists');
            }
        }

        Object.assign(account, updateDto);
        return this.accountsRepository.save(account);
    }

    async remove(id: string, user: User): Promise<void> {
        const account = await this.findOne(id, user);

        // Prevent deletion of system accounts
        if (account.isSystem) {
            throw new BadRequestException('Cannot delete system accounts');
        }

        // Check if account has children
        if (account.children && account.children.length > 0) {
            throw new BadRequestException('Cannot delete account with child accounts');
        }

        // Check if account has transactions (balance !== 0)
        if (account.balance !== 0) {
            throw new BadRequestException('Cannot delete account with non-zero balance');
        }

        await this.accountsRepository.remove(account);
    }

    async seedDefaultAccounts(companyId: string): Promise<void> {
        const defaultAccounts = this.getUAEDefaultAccounts(companyId);

        for (const accountData of defaultAccounts) {
            const existing = await this.accountsRepository.findOne({
                where: { code: accountData.code, company: { id: companyId } },
            });

            if (!existing) {
                const account = this.accountsRepository.create(accountData);
                await this.accountsRepository.save(account);
            }
        }
    }

    private getUAEDefaultAccounts(companyId: string): Partial<Account>[] {
        return [
            // Assets
            { code: '1000', name: 'Assets', type: AccountType.ASSET, subType: AccountSubType.CURRENT_ASSET, isSystem: true, company: { id: companyId } as Company },
            { code: '1100', name: 'Current Assets', type: AccountType.ASSET, subType: AccountSubType.CURRENT_ASSET, isSystem: true, company: { id: companyId } as Company },
            { code: '1110', name: 'Cash', type: AccountType.ASSET, subType: AccountSubType.CURRENT_ASSET, company: { id: companyId } as Company },
            { code: '1120', name: 'Bank Account', type: AccountType.ASSET, subType: AccountSubType.CURRENT_ASSET, company: { id: companyId } as Company },
            { code: '1200', name: 'Accounts Receivable', type: AccountType.ASSET, subType: AccountSubType.CURRENT_ASSET, company: { id: companyId } as Company },
            { code: '1300', name: 'VAT Receivable', type: AccountType.ASSET, subType: AccountSubType.CURRENT_ASSET, company: { id: companyId } as Company },
            { code: '1500', name: 'Fixed Assets', type: AccountType.ASSET, subType: AccountSubType.FIXED_ASSET, isSystem: true, company: { id: companyId } as Company },
            { code: '1510', name: 'Equipment', type: AccountType.ASSET, subType: AccountSubType.FIXED_ASSET, company: { id: companyId } as Company },
            { code: '1520', name: 'Furniture', type: AccountType.ASSET, subType: AccountSubType.FIXED_ASSET, company: { id: companyId } as Company },

            // Liabilities
            { code: '2000', name: 'Liabilities', type: AccountType.LIABILITY, subType: AccountSubType.CURRENT_LIABILITY, isSystem: true, company: { id: companyId } as Company },
            { code: '2100', name: 'Accounts Payable', type: AccountType.LIABILITY, subType: AccountSubType.CURRENT_LIABILITY, company: { id: companyId } as Company },
            { code: '2200', name: 'VAT Payable', type: AccountType.LIABILITY, subType: AccountSubType.CURRENT_LIABILITY, company: { id: companyId } as Company },
            { code: '2300', name: 'Salaries Payable', type: AccountType.LIABILITY, subType: AccountSubType.CURRENT_LIABILITY, company: { id: companyId } as Company },

            // Equity
            { code: '3000', name: 'Equity', type: AccountType.EQUITY, subType: AccountSubType.EQUITY, isSystem: true, company: { id: companyId } as Company },
            { code: '3100', name: 'Owner\'s Equity', type: AccountType.EQUITY, subType: AccountSubType.EQUITY, company: { id: companyId } as Company },
            { code: '3200', name: 'Retained Earnings', type: AccountType.EQUITY, subType: AccountSubType.RETAINED_EARNINGS, company: { id: companyId } as Company },

            // Revenue
            { code: '4000', name: 'Revenue', type: AccountType.REVENUE, subType: AccountSubType.OPERATING_REVENUE, isSystem: true, company: { id: companyId } as Company },
            { code: '4100', name: 'Sales Revenue', type: AccountType.REVENUE, subType: AccountSubType.OPERATING_REVENUE, company: { id: companyId } as Company },
            { code: '4200', name: 'Service Revenue', type: AccountType.REVENUE, subType: AccountSubType.OPERATING_REVENUE, company: { id: companyId } as Company },
            { code: '4300', name: 'Other Revenue', type: AccountType.REVENUE, subType: AccountSubType.OTHER_REVENUE, company: { id: companyId } as Company },

            // Expenses
            { code: '5000', name: 'Expenses', type: AccountType.EXPENSE, subType: AccountSubType.OPERATING_EXPENSE, isSystem: true, company: { id: companyId } as Company },
            { code: '5100', name: 'Cost of Goods Sold', type: AccountType.EXPENSE, subType: AccountSubType.COST_OF_GOODS_SOLD, company: { id: companyId } as Company },
            { code: '5200', name: 'Operating Expenses', type: AccountType.EXPENSE, subType: AccountSubType.OPERATING_EXPENSE, isSystem: true, company: { id: companyId } as Company },
            { code: '5210', name: 'Rent Expense', type: AccountType.EXPENSE, subType: AccountSubType.OPERATING_EXPENSE, company: { id: companyId } as Company },
            { code: '5220', name: 'Utilities Expense', type: AccountType.EXPENSE, subType: AccountSubType.OPERATING_EXPENSE, company: { id: companyId } as Company },
            { code: '5230', name: 'Salaries Expense', type: AccountType.EXPENSE, subType: AccountSubType.OPERATING_EXPENSE, company: { id: companyId } as Company },
            { code: '5240', name: 'Office Supplies', type: AccountType.EXPENSE, subType: AccountSubType.OPERATING_EXPENSE, company: { id: companyId } as Company },
            { code: '5250', name: 'Travel Expense', type: AccountType.EXPENSE, subType: AccountSubType.OPERATING_EXPENSE, company: { id: companyId } as Company },
        ];
    }
}
