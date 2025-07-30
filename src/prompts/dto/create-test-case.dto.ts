import { IsString, IsObject, IsOptional, IsBoolean } from 'class-validator';

export class CreateTestCaseDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsObject()
  input: Record<string, any>;

  @IsObject()
  expectedOutput: Record<string, any>;

  @IsOptional()
  @IsObject()
  variables?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
