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

  @IsObject()
  @IsOptional()
  company_filter_json?: object;

  @IsObject()
  @IsOptional()
  persona_filter_json?: object;

  @IsString()
  @IsOptional()
  status?: string;
}
