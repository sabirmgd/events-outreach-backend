import { IsEnum, IsArray, IsOptional } from 'class-validator';
import { Role } from '@/auth/enums/role.enum';
import { Permission } from '@/auth/enums/permission.enum';

export class UpdateUserPermissionsDto {
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsArray()
  @IsEnum(Permission, { each: true })
  customPermissions?: Permission[];
}
