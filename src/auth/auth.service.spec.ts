import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;
  let configService: ConfigService;

  const mockUser = {
    id: '1',
    email: 'test@test.com',
    username: 'testuser',
    password: 'hashedPassword',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUsersService = {
    create: jest.fn(),
    findByUsername: jest.fn(),
    findById: jest.fn(),
    updateRefreshToken: jest.fn(),
    validateRefreshToken: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
    decode: jest.fn(),
  };

  const mockConfigService = {
    getOrThrow: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user and return tokens', async () => {
      const createUserDto = {
        email: 'test@test.com',
        username: 'testuser',
        password: 'password123',
      };

      const userResponse = {
        id: '1',
        email: createUserDto.email,
        username: createUserDto.username,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUsersService.create.mockResolvedValue(userResponse);
      mockJwtService.signAsync
        .mockResolvedValueOnce('accessToken')
        .mockResolvedValueOnce('refreshToken');
      mockConfigService.getOrThrow
        .mockReturnValueOnce('jwt-secret')
        .mockReturnValueOnce('jwt-refresh-secret');

      const result = await service.register(createUserDto);

      expect(usersService.create).toHaveBeenCalledWith(createUserDto);
      expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
      expect(usersService.updateRefreshToken).toHaveBeenCalledWith('1', 'refreshToken');
      expect(result).toEqual({
        user: userResponse,
        accessToken: 'accessToken',
        refreshToken: 'refreshToken',
      });
    });
  });

  describe('login', () => {
    it('should login user with valid credentials', async () => {
      const loginDto = {
        username: 'testuser',
        password: 'password123',
      };

      mockUsersService.findByUsername.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.signAsync
        .mockResolvedValueOnce('accessToken')
        .mockResolvedValueOnce('refreshToken');
      mockConfigService.getOrThrow
        .mockReturnValueOnce('jwt-secret')
        .mockReturnValueOnce('jwt-refresh-secret');

      const result = await service.login(loginDto);

      expect(usersService.findByUsername).toHaveBeenCalledWith(loginDto.username);
      expect(bcrypt.compare).toHaveBeenCalledWith(loginDto.password, mockUser.password);
      expect(usersService.updateRefreshToken).toHaveBeenCalledWith('1', 'refreshToken');
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      const loginDto = {
        username: 'nonexistent',
        password: 'password123',
      };

      mockUsersService.findByUsername.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow('Invalid credentials');
    });

    it('should throw UnauthorizedException if password is incorrect', async () => {
      const loginDto = {
        username: 'testuser',
        password: 'wrongpassword',
      };

      mockUsersService.findByUsername.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow('Invalid credentials');
    });
  });

  describe('refreshToken', () => {
    it('should refresh tokens with valid refresh token', async () => {
      const refreshTokenDto = {
        refreshToken: 'validRefreshToken',
      };

      const decodedToken = {
        sub: '1',
        username: 'testuser',
      };

      mockJwtService.decode.mockReturnValue(decodedToken);
      mockUsersService.validateRefreshToken.mockResolvedValue(true);
      mockUsersService.findById.mockResolvedValue({
        id: '1',
        email: 'test@test.com',
        username: 'testuser',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockJwtService.signAsync
        .mockResolvedValueOnce('newAccessToken')
        .mockResolvedValueOnce('newRefreshToken');
      mockConfigService.getOrThrow
        .mockReturnValueOnce('jwt-secret')
        .mockReturnValueOnce('jwt-refresh-secret');

      const result = await service.refreshToken(refreshTokenDto);

      expect(jwtService.decode).toHaveBeenCalledWith('validRefreshToken');
      expect(usersService.validateRefreshToken).toHaveBeenCalledWith('1', 'validRefreshToken');
      expect(result).toEqual({
        accessToken: 'newAccessToken',
        refreshToken: 'newRefreshToken',
      });
    });

    it('should throw UnauthorizedException if refresh token is invalid', async () => {
      const refreshTokenDto = {
        refreshToken: 'invalidRefreshToken',
      };

      const decodedToken = {
        sub: '1',
        username: 'testuser',
      };

      mockJwtService.decode.mockReturnValue(decodedToken);
      mockUsersService.validateRefreshToken.mockResolvedValue(false);

      await expect(service.refreshToken(refreshTokenDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.refreshToken(refreshTokenDto)).rejects.toThrow('Invalid refresh token');
    });
  });

  describe('logout', () => {
    it('should logout user and invalidate refresh token', async () => {
      const userId = '1';

      await service.logout(userId);

      expect(usersService.updateRefreshToken).toHaveBeenCalledWith(userId, null);
    });
  });
});
