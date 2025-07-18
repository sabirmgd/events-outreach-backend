import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUrl,
  IsNumber,
} from 'class-validator';

export class CreatePersonDto {
  @IsString()
  @IsNotEmpty()
  full_name: string;

  @IsString()
  @IsOptional()
  first_name?: string;

  @IsString()
  @IsOptional()
  last_name?: string;

  @IsUrl()
  @IsOptional()
  linkedin_url?: string;

  @IsString()
  @IsOptional()
  seniority?: string;

  @IsString()
  @IsOptional()
  current_title?: string;

  @IsString()
  @IsOptional()
  location_text?: string;

  @IsNumber()
  @IsOptional()
  source_confidence?: number;
}
