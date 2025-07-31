import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsObject,
} from 'class-validator';

export class CreateOutreachSequenceDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  objective?: string;

  @IsInt()
  @IsOptional()
  event_id?: number;

  @IsString()
  @IsOptional()
  discovery_prompt?: string;

  @IsString()
  @IsOptional()
  outreach_context?: string;

  @IsObject()
  @IsOptional()
  template_variables?: Record<string, string>;

  @IsString()
  @IsOptional()
  status?: string;
}
