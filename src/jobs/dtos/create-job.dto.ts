import { IsEnum, IsObject } from 'class-validator';
import { JobType } from '../enums/job-type.enum';

export class CreateJobDto {
  @IsEnum(JobType)
  type: JobType;

  @IsObject()
  inputParameters: Record<string, any>;
} 