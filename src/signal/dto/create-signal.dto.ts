import {
  IsString,
  IsEnum,
  IsOptional,
  IsObject,
  ValidateNested,
  IsBoolean,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SignalType, SignalFrequency } from '../entities/signal.entity';

class DateRangeDto {
  @IsString()
  start: string;

  @IsString()
  end: string;
}

class ScheduleDto {
  @IsEnum(SignalFrequency)
  frequency: SignalFrequency;

  @IsOptional()
  @IsString()
  time?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsBoolean()
  enabled: boolean;
}

export class CreateSignalDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(SignalType)
  type: SignalType;

  @IsObject()
  configuration: {
    // Conference type
    event_type?: string;
    event_keywords?: string[];
    min_attendees?: number;
    max_attendees?: number;
    locations?: string[];
    industries?: string[];
    target_functions?: string[];
    date_range?: DateRangeDto;

    // Funding type
    funding_stage?: string;
    min_amount?: number;
    max_amount?: number;
    days_since_funding?: number;

    // Hiring type
    positions?: string[];
    seniority?: string;
    departments?: string[];
    days_since_posted?: number;

    // Common
    geographies?: string[];
    company_size?: string[];
    technologies?: string[];
  };

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ScheduleDto)
  schedule?: ScheduleDto;

  @IsUUID()
  @IsOptional()
  organizationId?: string;
}
