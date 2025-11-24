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

@Controller('quizzes')
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) {}

  // создать квиз
  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createQuizDto: CreateQuizDto) {
    return this.quizzesService.create(createQuizDto);
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
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() updateQuizDto: UpdateQuizDto) {
    return this.quizzesService.update(id, updateQuizDto);
  }

  // удалить квиз
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.quizzesService.remove(id);
  }
}
