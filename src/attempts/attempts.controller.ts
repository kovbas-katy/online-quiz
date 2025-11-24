import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AttemptsService } from './attempts.service';
import { StartAttemptDto } from './dto/start-attempt.dto';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';

@Controller('attempts')
@UseGuards(JwtAuthGuard)
export class AttemptsController {
  constructor(private readonly attemptsService: AttemptsService) {}

  // старт попытки (начать квиз)
  @Post('start')
  async start(
    @CurrentUser('id') userId: string,
    @Body() startAttemptDto: StartAttemptDto,
  ) {
    return await this.attemptsService.start(userId, startAttemptDto);
  }

  // состояние попытки по ID
  @Get(':id')
  getState(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.attemptsService.getState(id, userId);
  }

  // отправить ответ на вопрос
  @Post(':id/answer')
  submitAnswer(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() submitAnswerDto: SubmitAnswerDto,
  ) {
    return this.attemptsService.submitAnswer(id, userId, submitAnswerDto);
  }

  // завершить попытку
  @Post(':id/complete')
  complete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.attemptsService.complete(id, userId);
  }

  // результат попытки
  @Get(':id/result')
  getResult(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.attemptsService.getResult(id, userId);
  }
}
