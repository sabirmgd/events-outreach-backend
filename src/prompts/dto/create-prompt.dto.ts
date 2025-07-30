import {
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
  IsBoolean,
} from 'class-validator';
import { PromptType } from '../entities/prompt.entity';

export class CreatePromptDto {
  @IsString()
  key: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  namespace: string;

  @IsOptional()
  @IsEnum(PromptType)
  type?: PromptType = PromptType.SYSTEM;

  @IsOptional()
  @IsObject()
  variables?: Record<string, any>;

  @IsOptional()
  @IsString()
  agentId?: string;

  @IsOptional()
  @IsString()
  agentMethodName?: string;

  @IsString()
  body: string;

  @IsOptional()
  @IsString()
  changelog?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  isArchived?: boolean = false;
}
