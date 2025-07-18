import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsUrl,
  IsDateString,
} from 'class-validator';

export class CreateMeetingDto {
  @IsInt()
  @IsOptional()
  event_id?: number;

  @IsInt()
  @IsOptional()
  company_id?: number;

  @IsDateString()
  @IsNotEmpty()
  scheduled_start_dt: string;

  @IsDateString()
  @IsOptional()
  scheduled_end_dt?: string;

  @IsString()
  @IsOptional()
  booking_source?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsUrl()
  @IsOptional()
  meeting_url?: string;
}
