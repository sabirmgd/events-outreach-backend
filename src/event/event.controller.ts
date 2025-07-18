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
} from '@nestjs/common';
import { CreateEventDto } from './dto/create-event.dto';
import { DiscoverEventsDto } from './dto/discover-events.dto';
import { FindAllEventsDto } from './dto/find-all-events.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventService } from './event.service';

@Controller('events')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Post('discover')
  discoverEvents(@Body() discoverEventsDto: DiscoverEventsDto) {
    return this.eventService.discoverEvents(discoverEventsDto);
  }

  @Post('candidates/:id/promote')
  promoteCandidate(@Param('id', ParseIntPipe) id: number) {
    return this.eventService.promoteCandidate(id);
  }

  @Post('candidates/:id/reject')
  rejectCandidate(@Param('id', ParseIntPipe) id: number) {
    return this.eventService.rejectCandidate(id);
  }

  @Post()
  create(@Body() createEventDto: CreateEventDto) {
    return this.eventService.create(createEventDto);
  }

  @Get()
  findAll(@Query() findAllEventsDto: FindAllEventsDto) {
    return this.eventService.findAll(findAllEventsDto);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query('relations') relations: string[],
  ) {
    return this.eventService.findOne(id, relations);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateEventDto: UpdateEventDto,
  ) {
    return this.eventService.update(id, updateEventDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.eventService.remove(id);
  }

  @Post(':id/sponsors/rescan')
  rescanSponsors(@Param('id', ParseIntPipe) id: number) {
    return this.eventService.rescanSponsors(id);
  }
}
