import { IsString, IsOptional, IsArray, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class FindAllPersonasDto {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  relations?: string[];

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  sort?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  limit?: number;
}
