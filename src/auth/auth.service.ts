import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LoginDto } from '../users/dto/login.dto';
import { JwtPayload } from './strategies/jwt.strategy';
import { RefreshTokenDto } from '../users/dto/refresh-token.dto';
import { TokensDto } from './dto/tokens.dto';
import { AuthResponse } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(createUserDto: CreateUserDto): Promise<AuthResponse> {
    const user = await this.usersService.create(createUserDto);
    const tokens = await this.generateTokens(user.id, user.username, user.role);
    await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      user,
      ...tokens,
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const user = await this.usersService.findByUsername(loginDto.username);

    if (!user || !(await bcrypt.compare(loginDto.password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user.id, user.username, user.role);
    await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      ...tokens,
    };
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto) {
    const decoded = this.jwtService.decode(
      refreshTokenDto.refreshToken,
    ) as JwtPayload | null;

    if (!decoded?.sub) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const userId = decoded.sub;

    const isValid = await this.usersService.validateRefreshToken(
      userId,
      refreshTokenDto.refreshToken,
    );

    if (!isValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.usersService.findById(userId);
    const tokens = await this.generateTokens(user.id, user.username, user.role);
    await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async logout(userId: string) {
    await this.usersService.updateRefreshToken(userId, null);
  }

  private async generateTokens(userId: string, username: string, role: string): Promise<TokensDto> {
    const payload = { sub: userId, username, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }
}
