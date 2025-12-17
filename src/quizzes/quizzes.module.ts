import { Module } from '@nestjs/common';
import { QuizzesService } from './quizzes.service';
import { QuizzesController } from './quizzes.controller';
import { QuizOwnerGuard } from './guards/quiz-owner.guard';

@Module({
  controllers: [QuizzesController],
  providers: [QuizzesService, QuizOwnerGuard],
  exports: [QuizzesService],
})
export class QuizzesModule {}
