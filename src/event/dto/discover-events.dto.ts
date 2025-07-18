import { IsString, IsNotEmpty, IsArray } from 'class-validator';

export class DiscoverEventsDto {
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  cities: string[];

  @IsString()
  @IsNotEmpty()
  dateRange: string;

  @IsString()
  @IsNotEmpty()
  topic: string;
}
