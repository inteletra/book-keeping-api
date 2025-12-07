import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { User } from '../users/entities/user.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
        private configService: ConfigService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_SECRET') || 'defaultSecret123',
        });
    }

    async validate(payload: any) {
        console.log('Validating JWT payload:', payload);
        const user = await this.usersRepository.findOne({
            where: { id: payload.sub },
            relations: ['company'], // CRITICAL: Load company relation
        });

        if (!user) {
            console.log('User not found for payload:', payload);
            throw new UnauthorizedException();
        }

        if (!user.company) {
            console.warn(`User ${user.id} (${user.email}) has no company assigned!`);
            // Fail safe: reject access if no company, as most services require it
            throw new UnauthorizedException('User has no company assigned');
        } else {
            console.log(`User ${user.id} authenticated with company ${user.company.id}`);
        }

        return user;
    }
}
