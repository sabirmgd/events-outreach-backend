import { IsString, IsOptional, IsArray } from 'class-validator';

export class FindAllCompaniesDto {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  relations?: string[];
}
