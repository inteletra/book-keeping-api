import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Company } from '../companies/entities/company.entity';
import * as bcrypt from 'bcrypt';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { UserRole } from '@bookkeeping/shared';
import { AccountsService } from '../accounts/accounts.service';

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
        @InjectRepository(Company)
        private companiesRepository: Repository<Company>,
        private jwtService: JwtService,
        private accountsService: AccountsService,
    ) { }

    async register(registerDto: RegisterDto) {
        const { email, password, fullName, role, companyName } = registerDto;

        const existingUser = await this.usersRepository.findOne({ where: { email } });
        if (existingUser) {
            throw new UnauthorizedException('Email already exists');
        }

        // Create company first
        const company = this.companiesRepository.create({
            name: companyName || `${fullName}'s Company`,
        });
        await this.companiesRepository.save(company);

        // Seed default UAE chart of accounts for the new company
        await this.accountsService.seedDefaultAccounts(company.id);

        // Create user with company
        const passwordHash = await bcrypt.hash(password, 10);
        const user = this.usersRepository.create({
            email,
            passwordHash,
            fullName,
            role: role || UserRole.USER,
            company, // Associate company with user
        });

        await this.usersRepository.save(user);
        return this.login({ email, password });
    }

    async login(loginDto: LoginDto) {
        const { email, password } = loginDto;
        const user = await this.usersRepository.findOne({
            where: { email },
            relations: ['company'], // Load company for JWT payload
        });

        if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const payload = { sub: user.id, email: user.email, role: user.role };
        return {
            access_token: this.jwtService.sign(payload),
            user: {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
                role: user.role,
                companyId: user.company?.id,
            },
        };
    }
}
