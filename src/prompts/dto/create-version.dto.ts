import { IsString, IsOptional, IsObject } from 'class-validator';

export class CreateVersionDto {
  @IsString()
  body: string;

  @IsOptional()
  @IsString()
  changelog?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
