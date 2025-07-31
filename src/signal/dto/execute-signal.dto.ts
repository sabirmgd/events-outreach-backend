import { IsBoolean, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class ExecuteSignalDto {
  @IsOptional()
  @IsBoolean()
  test_mode?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  limit?: number;
}