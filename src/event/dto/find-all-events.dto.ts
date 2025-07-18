import { IsString, IsOptional, IsArray } from 'class-validator';

export class FindAllEventsDto {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  relations?: string[];
}
