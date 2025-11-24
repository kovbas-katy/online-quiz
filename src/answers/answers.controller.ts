import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AnswersService } from './answers.service';
import { CreateAnswerDto } from './dto/create-answer.dto';
import { UpdateAnswerDto } from './dto/update-answer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('answers')
export class AnswersController {
  constructor(private readonly answersService: AnswersService) {}

  // добавить вариант ответа
  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() createAnswerDto: CreateAnswerDto) {
    return await this.answersService.create(createAnswerDto);
  }

  // варианты ответа вопроса
  @Get()
  async findByQuestion(@Query('questionId') questionId: string) {
    return this.answersService.findByQuestion(questionId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.answersService.findOne(id);
  }

  // обновить вариант ответа
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() updateAnswerDto: UpdateAnswerDto,
  ) {
    return await this.answersService.update(id, updateAnswerDto);
  }

  // удалить вариант ответа
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string) {
    return await this.answersService.remove(id);
  }
}
