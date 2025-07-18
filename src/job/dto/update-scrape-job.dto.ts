import { PartialType } from '@nestjs/mapped-types';
import { CreateScrapeJobDto } from './create-scrape-job.dto';

export class UpdateScrapeJobDto extends PartialType(CreateScrapeJobDto) {}
