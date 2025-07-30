import {
  IsOptional,
  IsString,
  IsEnum,
  IsBoolean,
  IsNumber,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { PromptType } from '../entities/prompt.entity';
import { PromptVersionStatus } from '../entities/prompt-version.entity';

export class QueryPromptDto {
  @IsOptional()
  @IsString()
  namespace?: string;

  @IsOptional()
  @IsEnum(PromptType)
  type?: PromptType;

  @IsOptional()
  @IsEnum(PromptVersionStatus)
  status?: PromptVersionStatus;

  @IsOptional()
  @IsString()
  tag?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  agentId?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isArchived?: boolean = false;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  limit?: number = 20;
}
