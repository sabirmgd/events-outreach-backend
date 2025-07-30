import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
  IsNotEmpty,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PreviousStepContextDto {
  @IsNumber()
  @IsNotEmpty()
  day: number;

  @IsString()
  @IsNotEmpty()
  channel: string;

  @IsString()
  @IsOptional()
  subject?: string;

  @IsString()
  @IsNotEmpty()
  body: string;
}

export type MessageLength = 'short' | 'medium' | 'long';

export class GenerateMessagePreviewDto {
  @IsString()
  outreach_context: string;

  @IsString()
  @IsOptional()
  company_name?: string;

  @IsString()
  @IsOptional()
  person_name?: string;

  @IsNumber()
  day_offset: number;

  @IsString()
  channel: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => PreviousStepContextDto)
  previous_steps?: PreviousStepContextDto[];

  @IsString()
  @IsOptional()
  message_length?: MessageLength;

  @IsObject()
  @IsOptional()
  template_variables?: Record<string, string>;
}
