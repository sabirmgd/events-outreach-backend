import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CaslGuard } from '../auth/guards/casl.guard';
import { RequiredPermissions } from '../auth/decorators/permissions.decorator';
import { Action } from '../auth/enums/action.enum';
import { Organization } from './entities/organization.entity';

@Controller('organizations')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Post()
  @UseGuards(JwtAuthGuard, CaslGuard)
  @RequiredPermissions({ action: Action.Create, subject: Organization })
  async create(
    @Body() createOrganizationDto: CreateOrganizationDto,
    @Request() req: any,
  ) {
    // The authenticated user is attached to the request by Passport
    // The guard has already verified this user is a Super Admin
    const adminUser = req.user;
    return this.organizationService.create(createOrganizationDto, adminUser);
  }
}
