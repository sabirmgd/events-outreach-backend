import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateEmailSenderDto {
  @IsNotEmpty()
  @IsString()
  from_name: string;

  @IsNotEmpty()
  @IsEmail()
  from_email: string;

  @IsOptional()
  @IsString()
  sendgrid_key?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  daily_limit?: number;
}
