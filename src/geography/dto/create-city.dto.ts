import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class CreateCityDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  country_code: string;

  @IsString()
  @IsOptional()
  region?: string;

  @IsNumber()
  @IsOptional()
  lat?: number;

  @IsNumber()
  @IsOptional()
  lon?: number;
}
