import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUrl,
  IsDateString,
} from 'class-validator';

export class CreateScrapeJobDto {
  @IsString()
  @IsNotEmpty()
  job_type: string;

  @IsUrl()
  @IsOptional()
  target_url?: string;

  @IsString()
  @IsOptional()
  adapter?: string;

  @IsDateString()
  @IsOptional()
  started_at?: string;

  @IsDateString()
  @IsOptional()
  finished_at?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  error_msg?: string;
}
