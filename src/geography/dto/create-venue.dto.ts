import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsInt,
} from 'class-validator';

export class CreateVenueDto {
  @IsInt()
  @IsNotEmpty()
  cityId: number;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsNumber()
  @IsOptional()
  lat?: number;

  @IsNumber()
  @IsOptional()
  lon?: number;

  @IsString()
  @IsOptional()
  normalized_name?: string;
}
