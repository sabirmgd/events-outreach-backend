import { IsString, IsOptional } from 'class-validator';

export class CreatePromptTagDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  color?: string;
}
