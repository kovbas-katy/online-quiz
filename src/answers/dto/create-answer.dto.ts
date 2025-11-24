import { IsString, IsBoolean, IsUUID } from 'class-validator';

export class CreateAnswerDto {
  @IsUUID()
  questionId: string;

  @IsString()
  text: string;

  @IsBoolean()
  isCorrect: boolean;
}
