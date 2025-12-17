import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    refreshToken: jest.fn(),
    logout: jest.fn(),
  };

  const mockAuthResponse = {
    user: {
      id: '1',
      email: 'test@test.com',
      username: 'testuser',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    accessToken: 'accessToken',
    refreshToken: 'refreshToken',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const createUserDto = {
        email: 'test@test.com',
        username: 'testuser',
        password: 'password123',
      };

      mockAuthService.register.mockResolvedValue(mockAuthResponse);

      const result = await controller.register(createUserDto);

      expect(authService.register).toHaveBeenCalledWith(createUserDto);
      expect(result).toEqual(mockAuthResponse);
    });
  });

  describe('login', () => {
    it('should login user', async () => {
      const loginDto = {
        username: 'testuser',
        password: 'password123',
      };

      mockAuthService.login.mockResolvedValue(mockAuthResponse);

      const result = await controller.login(loginDto);

      expect(authService.login).toHaveBeenCalledWith(loginDto);
      expect(result).toEqual(mockAuthResponse);
    });
  });

  describe('refresh', () => {
    it('should refresh tokens', async () => {
      const refreshTokenDto = {
        refreshToken: 'refreshToken',
      };

      const tokensResponse = {
        accessToken: 'newAccessToken',
        refreshToken: 'newRefreshToken',
      };

      mockAuthService.refreshToken.mockResolvedValue(tokensResponse);

      const result = await controller.refresh(refreshTokenDto);

      expect(authService.refreshToken).toHaveBeenCalledWith(refreshTokenDto);
      expect(result).toEqual(tokensResponse);
    });
  });

  describe('logout', () => {
    it('should logout user', async () => {
      const userId = '1';

      mockAuthService.logout.mockResolvedValue(undefined);

      const result = await controller.logout(userId);

      expect(authService.logout).toHaveBeenCalledWith(userId);
      expect(result).toEqual({ message: 'Logged out successfully' });
    });
  });
});
