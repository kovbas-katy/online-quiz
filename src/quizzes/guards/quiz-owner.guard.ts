import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class QuizOwnerGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const quizId = request.params.id;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Админ может редактировать/удалять любые викторины
    if (user.role === 'ADMIN') {
      return true;
    }

    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      select: { authorId: true },
    });

    if (!quiz) {
      throw new NotFoundException(`Quiz with ID ${quizId} not found`);
    }

    // Пользователь может редактировать/удалять только свои викторины
    if (quiz.authorId !== user.id) {
      throw new ForbiddenException('You can only modify your own quizzes');
    }

    return true;
  }
}
