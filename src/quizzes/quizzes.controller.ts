import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { QuizzesService } from './quizzes.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { QuizOwnerGuard } from './guards/quiz-owner.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('quizzes')
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) {}

  // создать квиз
  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Body() createQuizDto: CreateQuizDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.quizzesService.create(createQuizDto, userId);
  }

  // список квизов
  @Get()
  findAll() {
    return this.quizzesService.findAll();
  }

  // поиск квизов
  @Get('search')
  search(@Query('q') query: string, @Query('categoryId') categoryId?: string) {
    return this.quizzesService.search(query, categoryId);
  }

  // квизы текущего пользователя (для админа — все)
  @Get('my')
  @UseGuards(JwtAuthGuard)
  getMyQuizzes(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    if (role === Role.ADMIN) {
      return this.quizzesService.findAll();
    }
    return this.quizzesService.findByUser(userId);
  }

  // лидерборд квиза
  @Get(':id/leaderboard')
  getLeaderboard(@Param('id') id: string, @Query('limit') limit?: string) {
    return this.quizzesService.getLeaderboard(id, limit ? parseInt(limit) : 10);
  }

  // квиз по ID
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.quizzesService.findOne(id);
  }

  // обновить квиз
  @Put(':id')
  @UseGuards(JwtAuthGuard, QuizOwnerGuard)
  update(@Param('id') id: string, @Body() updateQuizDto: UpdateQuizDto) {
    return this.quizzesService.update(id, updateQuizDto);
  }

  // удалить квиз
  @Delete(':id')
  @UseGuards(JwtAuthGuard, QuizOwnerGuard)
  remove(@Param('id') id: string) {
    return this.quizzesService.remove(id);
  }
}
