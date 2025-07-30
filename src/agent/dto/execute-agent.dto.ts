import { IsString, IsObject, IsOptional, IsUUID } from 'class-validator';

export class ExecuteAgentDto {
  @IsObject()
  params: Record<string, any>;

  @IsOptional()
  @IsUUID()
  executionId?: string;
}
