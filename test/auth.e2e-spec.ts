import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

    prisma = app.get<PrismaService>(PrismaService);

    await app.init();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    await prisma.attemptAnswer.deleteMany();
    await prisma.attempt.deleteMany();
    await prisma.answer.deleteMany();
    await prisma.question.deleteMany();
    await prisma.quiz.deleteMany();
    await prisma.category.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('/auth/register (POST)', () => {
    it('should register a new user', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@test.com',
          username: 'testuser',
          password: 'password123',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('user');
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          expect(res.body.user.email).toBe('test@test.com');
          expect(res.body.user.username).toBe('testuser');
        });
    });

    it('should fail with duplicate email', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@test.com',
          username: 'testuser',
          password: 'password123',
        })
        .expect(201);

      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@test.com',
          username: 'anotheruser',
          password: 'password123',
        })
        .expect(409);
    });

    it('should fail with duplicate username', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@test.com',
          username: 'testuser',
          password: 'password123',
        })
        .expect(201);

      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'another@test.com',
          username: 'testuser',
          password: 'password123',
        })
        .expect(409);
    });

    it('should fail with invalid email', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'invalid-email',
          username: 'testuser',
          password: 'password123',
        })
        .expect(400);
    });
  });

  describe('/auth/login (POST)', () => {
    beforeEach(async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@test.com',
          username: 'testuser',
          password: 'password123',
        });
    });

    it('should login with valid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: 'testuser',
          password: 'password123',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('user');
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
        });
    });

    it('should fail with wrong password', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: 'testuser',
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('should fail with non-existent user', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: 'nonexistent',
          password: 'password123',
        })
        .expect(401);
    });
  });

  describe('/auth/refresh (POST)', () => {
    let refreshToken: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@test.com',
          username: 'testuser',
          password: 'password123',
        });

      refreshToken = response.body.refreshToken;
    });

    it('should refresh tokens with valid refresh token', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
        });
    });

    it('should fail with invalid refresh token', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);
    });
  });

  describe('/auth/logout (POST)', () => {
    let accessToken: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@test.com',
          username: 'testuser',
          password: 'password123',
        });

      accessToken = response.body.accessToken;
    });

    it('should logout user', () => {
      return request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201)
        .expect((res) => {
          expect(res.body.message).toBe('Logged out successfully');
        });
    });

    it('should fail without token', () => {
      return request(app.getHttpServer())
        .post('/auth/logout')
        .expect(401);
    });
  });

  describe('Auth flow (integration)', () => {
    it('should complete full auth flow', async () => {
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@test.com',
          username: 'testuser',
          password: 'password123',
        })
        .expect(201);

      expect(registerResponse.body).toHaveProperty('accessToken');
      expect(registerResponse.body).toHaveProperty('refreshToken');

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: 'testuser',
          password: 'password123',
        })
        .expect(201);

      expect(loginResponse.body).toHaveProperty('accessToken');

      const refreshResponse = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: loginResponse.body.refreshToken })
        .expect(201);

      expect(refreshResponse.body).toHaveProperty('accessToken');

      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${refreshResponse.body.accessToken}`)
        .expect(201);
    });
  });
});
