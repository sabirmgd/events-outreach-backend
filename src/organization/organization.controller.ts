import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CaslGuard } from '../auth/guards/casl.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { Action } from '../auth/enums/action.enum';
import { Organization } from './entities/organization.entity';
import { CreateEmailSenderDto } from './dto/create-email-sender.dto';

@Controller('organizations')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Post()
  @UseGuards(JwtAuthGuard, CaslGuard)
  @RequirePermissions({ action: Action.Create, subject: Organization })
  async create(
    @Body() createOrganizationDto: CreateOrganizationDto,
    @Request() req: any,
  ) {
    // The authenticated user is attached to the request by Passport
    // The guard has already verified this user is a Super Admin
    const adminUser = req.user;
    return this.organizationService.create(createOrganizationDto, adminUser);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string) {
    return this.organizationService.findOne(id);
  }

  @Post(':id/email-senders')
  @UseGuards(JwtAuthGuard)
  async createEmailSender(
    @Param('id') organizationId: string,
    @Body() createEmailSenderDto: CreateEmailSenderDto,
  ) {
    return this.organizationService.createEmailSender(
      organizationId,
      createEmailSenderDto,
    );
  }

  @Get(':id/email-senders')
  @UseGuards(JwtAuthGuard)
  async getEmailSenders(@Param('id') organizationId: string) {
    return this.organizationService.getEmailSenders(organizationId);
  }
}
