import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateOrganizationWithAdminDto } from './dto/create-organization-with-admin.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CaslGuard } from '../auth/guards/casl.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { Action } from '../auth/enums/action.enum';
import { Organization } from '../organization/entities/organization.entity';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, CaslGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('organizations')
  @RequirePermissions({ action: Action.Create, subject: Organization })
  createOrganizationWithAdmin(@Body() dto: CreateOrganizationWithAdminDto) {
    return this.adminService.createOrganizationWithAdmin(dto);
  }

  @Get('organizations')
  @RequirePermissions({ action: Action.Read, subject: Organization })
  findAllOrganizations() {
    return this.adminService.findAllOrganizationsWithAdmins();
  }

  @Patch('organizations/:id')
  @RequirePermissions({ action: Action.Update, subject: Organization })
  updateOrganization(
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.adminService.updateOrganization(id, dto);
  }

  @Delete('organizations/:id')
  @RequirePermissions({ action: Action.Delete, subject: Organization })
  deleteOrganization(@Param('id') id: string) {
    return this.adminService.deleteOrganization(id);
  }
}
