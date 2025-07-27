import { IsOptional, IsString } from 'class-validator';

export class UpdateOrganizationDto {
  @IsString()
  @IsOptional()
  organizationName?: string;

  @IsString()
  @IsOptional()
  adminName?: string;
}
