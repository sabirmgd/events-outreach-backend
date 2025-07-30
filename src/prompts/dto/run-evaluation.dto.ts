import { IsString, IsObject, IsOptional, IsUUID } from 'class-validator';

export class RunEvaluationDto {
  @IsOptional()
  @IsUUID()
  versionId?: string;

  @IsObject()
  input: Record<string, any>;

  @IsOptional()
  @IsObject()
  variables?: Record<string, any>;

  @IsOptional()
  @IsString()
  agentId?: string;

  @IsOptional()
  @IsString()
  agentMethodName?: string;
}
