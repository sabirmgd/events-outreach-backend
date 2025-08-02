import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class DiscoverSignalDto {
  @IsString()
  prompt: string;

  @IsOptional()
  @IsBoolean()
  preview?: boolean;
}
