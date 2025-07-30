import {
  Controller,
  Get,
  UseGuards,
  Query,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConversationService } from './conversation.service';
import { FindConversationsDto } from './dto/find-conversations.dto';
import { JwtPayload } from '../auth/dto/jwt-payload.dto';

@Controller('outreach/conversations')
@UseGuards(JwtAuthGuard)
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  @Get()
  findAll(
    @Query() query: FindConversationsDto,
    @Req() req: { user: JwtPayload },
  ) {
    const { organizationId } = req.user;
    if (!organizationId) {
      throw new ForbiddenException('User is not part of an organization.');
    }
    return this.conversationService.findAll(organizationId, query);
  }
}
