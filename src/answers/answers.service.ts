import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAnswerDto } from './dto/create-answer.dto';
import { UpdateAnswerDto } from './dto/update-answer.dto';

@Injectable()
export class AnswersService {
  constructor(private prisma: PrismaService) {}

  async create(createAnswerDto: CreateAnswerDto) {
    return this.prisma.answer.create({
      data: createAnswerDto,
      include: {
        question: {
          select: {
            id: true,
            text: true,
          },
        },
      },
    });
  }

  async findByQuestion(questionId: string) {
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
    });

    if (!question) {
      throw new NotFoundException(`Question with ID ${questionId} not found`);
    }

    return this.prisma.answer.findMany({
      where: { questionId },
    });
  }

  async findOne(id: string) {
    const answer = await this.prisma.answer.findUnique({
      where: { id },
      include: {
        question: {
          select: {
            id: true,
            text: true,
          },
        },
      },
    });

    if (!answer) {
      throw new NotFoundException(`Answer with ID ${id} not found`);
    }

    return answer;
  }

  async update(id: string, updateAnswerDto: UpdateAnswerDto) {
    const answer = await this.prisma.answer.findUnique({ where: { id } });

    if (!answer) {
      throw new NotFoundException(`Answer with ID ${id} not found`);
    }

    return this.prisma.answer.update({
      where: { id },
      data: updateAnswerDto,
    });
  }

  async remove(id: string) {
    const answer = await this.prisma.answer.findUnique({ where: { id } });

    if (!answer) {
      throw new NotFoundException(`Answer with ID ${id} not found`);
    }

    await this.prisma.answer.delete({ where: { id } });
    return { message: 'Answer deleted successfully' };
  }
}
