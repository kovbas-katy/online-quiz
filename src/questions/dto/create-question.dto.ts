import { IsString, IsInt, Min, IsUUID } from 'class-validator';

export class CreateQuestionDto {
  @IsUUID()
  quizId: string;

  @IsString()
  text: string;

  @IsInt()
  @Min(1)
  order: number;

  @IsInt()
  @Min(1)
  points: number;
}
