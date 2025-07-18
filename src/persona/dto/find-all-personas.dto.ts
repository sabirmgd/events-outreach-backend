import { IsString, IsOptional, IsArray } from 'class-validator';

export class FindAllPersonasDto {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  relations?: string[];
}
