import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StartAttemptDto } from './dto/start-attempt.dto';
import { SubmitAnswerDto } from './dto/submit-answer.dto';

@Injectable()
export class AttemptsService {
  constructor(private prisma: PrismaService) {}

  async start(userId: string, startAttemptDto: StartAttemptDto) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: startAttemptDto.quizId },
      include: {
        questions: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!quiz) {
      throw new NotFoundException(
        `Quiz with ID ${startAttemptDto.quizId} not found`,
      );
    }

    if (quiz.questions.length === 0) {
      throw new BadRequestException('Quiz has no questions');
    }

    const maxScore = quiz.questions.reduce((sum, q) => sum + q.points, 0);

    const attempt = await this.prisma.attempt.create({
      data: {
        userId,
        quizId: startAttemptDto.quizId,
        maxScore,
        score: 0,
      },
      include: {
        quiz: {
          include: {
            questions: {
              orderBy: { order: 'asc' },
              include: {
                answers: {
                  select: {
                    id: true,
                    text: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return {
      id: attempt.id,
      quizId: attempt.quizId,
      startedAt: attempt.startedAt,
      timeLimit: quiz.timeLimit,
      questions: attempt.quiz.questions.map((q) => ({
        id: q.id,
        text: q.text,
        order: q.order,
        points: q.points,
        answers: q.answers,
      })),
    };
  }

  async getState(attemptId: string, userId: string) {
    const attempt = await this.prisma.attempt.findUnique({
      where: { id: attemptId },
      include: {
        quiz: {
          include: {
            questions: {
              orderBy: { order: 'asc' },
              include: {
                answers: {
                  select: {
                    id: true,
                    text: true,
                  },
                },
              },
            },
          },
        },
        attemptAnswers: true,
      },
    });

    if (!attempt) {
      throw new NotFoundException(`Attempt with ID ${attemptId} not found`);
    }

    if (attempt.userId !== userId) {
      throw new ForbiddenException('You do not have access to this attempt');
    }

    return {
      id: attempt.id,
      status: attempt.status,
      startedAt: attempt.startedAt,
      completedAt: attempt.completedAt,
      score: attempt.score,
      maxScore: attempt.maxScore,
      timeLimit: attempt.quiz.timeLimit,
      questions: attempt.quiz.questions.map((q) => ({
        id: q.id,
        text: q.text,
        order: q.order,
        points: q.points,
        answers: q.answers,
        userAnswer: attempt.attemptAnswers.find((aa) => aa.questionId === q.id)
          ?.answerId,
      })),
    };
  }

  async submitAnswer(
    attemptId: string,
    userId: string,
    submitAnswerDto: SubmitAnswerDto,
  ) {
    const attempt = await this.prisma.attempt.findUnique({
      where: { id: attemptId },
    });

    if (!attempt) {
      throw new NotFoundException(`Attempt with ID ${attemptId} not found`);
    }

    if (attempt.userId !== userId) {
      throw new ForbiddenException('You do not have access to this attempt');
    }

    if (attempt.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Attempt is not in progress');
    }

    const question = await this.prisma.question.findFirst({
      where: {
        id: submitAnswerDto.questionId,
        quizId: attempt.quizId,
      },
    });

    if (!question) {
      throw new NotFoundException('Question not found in this quiz');
    }

    const answer = await this.prisma.answer.findFirst({
      where: {
        id: submitAnswerDto.answerId,
        questionId: submitAnswerDto.questionId,
      },
    });

    if (!answer) {
      throw new NotFoundException('Answer not found for this question');
    }

    await this.prisma.attemptAnswer.upsert({
      where: {
        attemptId_questionId: {
          attemptId,
          questionId: submitAnswerDto.questionId,
        },
      },
      create: {
        attemptId,
        questionId: submitAnswerDto.questionId,
        answerId: submitAnswerDto.answerId,
      },
      update: {
        answerId: submitAnswerDto.answerId,
      },
    });

    return { message: 'Answer submitted successfully' };
  }

  async complete(attemptId: string, userId: string) {
    const attempt = await this.prisma.attempt.findUnique({
      where: { id: attemptId },
      include: {
        attemptAnswers: {
          include: {
            answer: true,
            question: true,
          },
        },
      },
    });

    if (!attempt) {
      throw new NotFoundException(`Attempt with ID ${attemptId} not found`);
    }

    if (attempt.userId !== userId) {
      throw new ForbiddenException('You do not have access to this attempt');
    }

    if (attempt.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Attempt is not in progress');
    }

    // Подсчитываем очки
    let score = 0;
    for (const attemptAnswer of attempt.attemptAnswers) {
      if (attemptAnswer.answer?.isCorrect) {
        score += attemptAnswer.question.points;
      }
    }

    // Обновляем попытку
    const updatedAttempt = await this.prisma.attempt.update({
      where: { id: attemptId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        score,
      },
    });

    return {
      id: updatedAttempt.id,
      status: updatedAttempt.status,
      score: updatedAttempt.score,
      maxScore: updatedAttempt.maxScore,
      completedAt: updatedAttempt.completedAt,
    };
  }

  async getResult(attemptId: string, userId: string) {
    const attempt = await this.prisma.attempt.findUnique({
      where: { id: attemptId },
      include: {
        quiz: {
          select: {
            id: true,
            title: true,
          },
        },
        attemptAnswers: {
          include: {
            question: {
              select: {
                id: true,
                text: true,
                points: true,
              },
            },
            answer: {
              select: {
                id: true,
                text: true,
                isCorrect: true,
              },
            },
          },
        },
      },
    });

    if (!attempt) {
      throw new NotFoundException(`Attempt with ID ${attemptId} not found`);
    }

    if (attempt.userId !== userId) {
      throw new ForbiddenException('You do not have access to this attempt');
    }

    if (attempt.status !== 'COMPLETED') {
      throw new BadRequestException('Attempt is not completed yet');
    }

    const correctAnswers = await this.prisma.answer.findMany({
      where: {
        questionId: {
          in: attempt.attemptAnswers.map((aa) => aa.questionId),
        },
        isCorrect: true,
      },
    });

    const correctAnswersMap = new Map(
      correctAnswers.map((a) => [a.questionId, a]),
    );

    return {
      id: attempt.id,
      quiz: attempt.quiz,
      score: attempt.score,
      maxScore: attempt.maxScore,
      percentage:
        attempt.maxScore && attempt.score
          ? Math.round((attempt.score / attempt.maxScore) * 100)
          : 0,
      startedAt: attempt.startedAt,
      completedAt: attempt.completedAt,
      questions: attempt.attemptAnswers.map((aa) => ({
        question: aa.question,
        userAnswer: aa.answer,
        correctAnswer: correctAnswersMap.get(aa.questionId),
        isCorrect: aa.answer?.isCorrect || false,
        pointsEarned: aa.answer?.isCorrect ? aa.question.points : 0,
      })),
    };
  }
}
