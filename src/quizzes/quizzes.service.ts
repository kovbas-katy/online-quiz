import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class QuizzesService {
  constructor(private prisma: PrismaService) {}

  async create(createQuizDto: CreateQuizDto) {
    return this.prisma.quiz.create({
      data: createQuizDto,
      include: {
        category: true,
      },
    });
  }

  async findAll() {
    return this.prisma.quiz.findMany({
      include: {
        category: true,
        _count: {
          select: { questions: true, attempts: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id },
      include: {
        category: true,
        questions: {
          orderBy: { order: 'asc' },
          include: {
            answers: true,
          },
        },
      },
    });

    if (!quiz) {
      throw new NotFoundException(`Quiz with ID ${id} not found`);
    }

    return quiz;
  }

  async update(id: string, updateQuizDto: UpdateQuizDto) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id } });

    if (!quiz) {
      throw new NotFoundException(`Quiz with ID ${id} not found`);
    }

    return this.prisma.quiz.update({
      where: { id },
      data: updateQuizDto,
      include: {
        category: true,
      },
    });
  }

  async remove(id: string) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id } });

    if (!quiz) {
      throw new NotFoundException(`Quiz with ID ${id} not found`);
    }

    await this.prisma.quiz.delete({ where: { id } });
    return { message: 'Quiz deleted successfully' };
  }

  async getLeaderboard(id: string, limit: number = 10) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id },
    });

    if (!quiz) {
      throw new NotFoundException(`Quiz with ID ${id} not found`);
    }

    const leaderboard = await this.prisma.attempt.findMany({
      where: {
        quizId: id,
        status: 'COMPLETED',
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: [{ score: 'desc' }, { completedAt: 'asc' }],
      take: limit,
    });

    return leaderboard.map((attempt, index) => ({
      rank: index + 1,
      userId: attempt.user.id,
      username: attempt.user.username,
      score: attempt.score,
      maxScore: attempt.maxScore,
      percentage:
        attempt.maxScore && attempt.score
          ? Math.round((attempt.score / attempt.maxScore) * 100)
          : 0,
      completedAt: attempt.completedAt,
    }));
  }

  async search(query: string, categoryId?: string) {
    const where: Prisma.QuizWhereInput = {
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ],
    };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    return this.prisma.quiz.findMany({
      where,
      include: {
        category: true,
        _count: {
          select: { questions: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
