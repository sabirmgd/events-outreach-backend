import { IsString, IsNotEmpty, IsOptional, IsInt } from 'class-validator';

export class CreateOutreachStepTemplateDto {
  @IsInt()
  @IsNotEmpty()
  sequence_id: number;

  @IsInt()
  @IsNotEmpty()
  step_number: number;

  @IsString()
  @IsNotEmpty()
  channel: string;

  @IsInt()
  @IsNotEmpty()
  day_offset: number;

  @IsString()
  @IsOptional()
  subject_template?: string;

  @IsString()
  @IsOptional()
  body_template?: string;

  @IsInt()
  @IsOptional()
  max_retries?: number;
}
