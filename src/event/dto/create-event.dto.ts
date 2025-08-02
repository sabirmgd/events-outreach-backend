import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsUrl,
  IsDateString,
  IsUUID,
} from 'class-validator';

export class CreateEventDto {
  @IsInt()
  @IsOptional()
  venue_id?: number;

  @IsInt()
  @IsNotEmpty()
  city_id: number;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsDateString()
  @IsNotEmpty()
  start_dt: string;

  @IsDateString()
  @IsOptional()
  end_dt?: string;

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsInt()
  @IsOptional()
  expected_attendance_int?: number;

  @IsString()
  @IsOptional()
  size_band?: string;

  @IsString()
  @IsOptional()
  description_text?: string;

  @IsUrl()
  @IsOptional()
  website_url?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsInt()
  @IsOptional()
  created_from_candidate_id?: number;

  @IsUUID()
  @IsOptional()
  signalId?: string;
}
