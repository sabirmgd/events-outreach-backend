import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CreateEventDto } from './dto/create-event.dto';
import { DiscoverEventsDto } from './dto/discover-events.dto';
import { FindAllEventsDto } from './dto/find-all-events.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventService } from './event.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CaslGuard } from '../auth/guards/casl.guard';
import { RequiredPermissions } from '../auth/decorators/permissions.decorator';
import { Action } from '../auth/enums/action.enum';
import { Event as EventEntity } from './entities/event.entity';

@UseGuards(JwtAuthGuard, CaslGuard)
@Controller('events')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @RequiredPermissions({ action: Action.Create, subject: EventEntity })
  @Post('discover')
  discoverEvents(@Body() discoverEventsDto: DiscoverEventsDto) {
    return this.eventService.discoverEvents(discoverEventsDto);
  }

  @RequiredPermissions({ action: Action.Create, subject: EventEntity })
  @Post('candidates/:id/promote')
  promoteCandidate(@Param('id', ParseIntPipe) id: number) {
    return this.eventService.promoteCandidate(id);
  }

  @RequiredPermissions({ action: Action.Update, subject: EventEntity })
  @Post('candidates/:id/reject')
  rejectCandidate(@Param('id', ParseIntPipe) id: number) {
    return this.eventService.rejectCandidate(id);
  }

  @RequiredPermissions({ action: Action.Create, subject: EventEntity })
  @Post()
  create(@Body() createEventDto: CreateEventDto) {
    return this.eventService.create(createEventDto);
  }

  @RequiredPermissions({ action: Action.Read, subject: EventEntity })
  @Get()
  findAll(@Query() findAllEventsDto: FindAllEventsDto) {
    return this.eventService.findAll(findAllEventsDto);
  }

  @RequiredPermissions({ action: Action.Read, subject: EventEntity })
  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query('relations') relations: string[],
  ) {
    return this.eventService.findOne(id, relations);
  }

  @RequiredPermissions({ action: Action.Update, subject: EventEntity })
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateEventDto: UpdateEventDto,
  ) {
    return this.eventService.update(id, updateEventDto);
  }

  @RequiredPermissions({ action: Action.Delete, subject: EventEntity })
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.eventService.remove(id);
  }

  @RequiredPermissions({ action: Action.Update, subject: EventEntity })
  @Post(':id/sponsors/rescan')
  rescanSponsors(@Param('id', ParseIntPipe) id: number) {
    return this.eventService.rescanSponsors(id);
  }
}
