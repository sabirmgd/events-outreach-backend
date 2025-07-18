import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsUrl,
} from 'class-validator';

export class CreateCompanyDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  legal_name?: string;

  @IsUrl()
  @IsOptional()
  website?: string;

  @IsUrl()
  @IsOptional()
  linkedin_url?: string;

  @IsUrl()
  @IsOptional()
  crunchbase_url?: string;

  @IsInt()
  @IsOptional()
  hq_city_id?: number;

  @IsString()
  @IsOptional()
  employee_range?: string;

  @IsString()
  @IsOptional()
  revenue_range?: string;

  @IsString()
  @IsOptional()
  primary_industry?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
