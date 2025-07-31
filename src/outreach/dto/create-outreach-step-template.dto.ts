import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsBoolean,
} from 'class-validator';

export class CreateOutreachStepTemplateDto {
  @IsInt()
  @IsNotEmpty()
  sequence_id: number;

  @IsString()
  @IsNotEmpty()
  applies_to_stage: string;

  @IsString()
  @IsNotEmpty()
  channel: string;

  @IsString()
  @IsOptional()
  channel_strategy?: string;

  @IsBoolean()
  @IsOptional()
  use_ai_generation?: boolean;

  @IsString()
  @IsOptional()
  message_length?: 'short' | 'medium' | 'long';

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
