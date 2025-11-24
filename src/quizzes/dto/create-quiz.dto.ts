import { IsString, IsOptional, IsInt, Min, IsUUID } from 'class-validator';

export class CreateQuizDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsUUID()
  categoryId: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  timeLimit?: number; // В секундах
}
