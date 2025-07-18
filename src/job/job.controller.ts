import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CreateScrapeJobDto } from './dto/create-scrape-job.dto';
import { UpdateScrapeJobDto } from './dto/update-scrape-job.dto';
import { JobService } from './job.service';

@Controller('jobs/scrape')
export class JobController {
  constructor(private readonly jobService: JobService) {}

  @Post()
  create(@Body() createScrapeJobDto: CreateScrapeJobDto) {
    return this.jobService.create(createScrapeJobDto);
  }

  @Get()
  findAll() {
    return this.jobService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.jobService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateScrapeJobDto: UpdateScrapeJobDto,
  ) {
    return this.jobService.update(id, updateScrapeJobDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.jobService.remove(id);
  }
}
