import { IsOptional, IsString } from 'class-validator';

export class PublishVersionDto {
  @IsOptional()
  @IsString()
  publishedBy?: string;
}
