import { IsObject, IsOptional } from 'class-validator';

export class PreviewPromptDto {
  @IsOptional()
  @IsObject()
  variables?: Record<string, any>;
}
