import { IsString, IsNotEmpty, IsEmail } from 'class-validator';

export class CreateOrganizationWithAdminDto {
  @IsString()
  @IsNotEmpty()
  organizationName: string;

  @IsString()
  @IsNotEmpty()
  adminName: string;

  @IsEmail()
  @IsNotEmpty()
  adminEmail: string;
}
