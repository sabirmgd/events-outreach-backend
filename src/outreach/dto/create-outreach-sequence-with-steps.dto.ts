import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsObject,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateOutreachStepDto } from './create-outreach-step.dto';

export class CreateOutreachSequenceWithStepsDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  objective?: string;

  @IsString()
  @IsOptional()
  discovery_prompt: string;

  @IsString()
  @IsOptional()
  outreach_context: string;

  @IsObject()
  @IsOptional()
  template_variables: Record<string, string>;

  @IsString()
  @IsOptional()
  status?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOutreachStepDto)
  steps: CreateOutreachStepDto[];
}
