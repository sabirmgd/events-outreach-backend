import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateScrapeJobDto } from './dto/create-scrape-job.dto';
import { UpdateScrapeJobDto } from './dto/update-scrape-job.dto';
import { ScrapeJob } from './entities/scrape-job.entity';

@Injectable()
export class JobService {
  constructor(
    @InjectRepository(ScrapeJob)
    private readonly scrapeJobRepository: Repository<ScrapeJob>,
  ) {}

  create(createScrapeJobDto: CreateScrapeJobDto): Promise<ScrapeJob> {
    const job = this.scrapeJobRepository.create(createScrapeJobDto);
    return this.scrapeJobRepository.save(job);
  }

  findAll(): Promise<ScrapeJob[]> {
    return this.scrapeJobRepository.find();
  }

  async findOne(id: number): Promise<ScrapeJob> {
    const job = await this.scrapeJobRepository.findOne({ where: { id } });
    if (!job) {
      throw new NotFoundException(`ScrapeJob with ID ${id} not found`);
    }
    return job;
  }

  async update(
    id: number,
    updateScrapeJobDto: UpdateScrapeJobDto,
  ): Promise<ScrapeJob> {
    const job = await this.findOne(id);
    const updated = this.scrapeJobRepository.merge(job, updateScrapeJobDto);
    return this.scrapeJobRepository.save(updated);
  }

  async remove(id: number): Promise<{ deleted: boolean; id?: number }> {
    const result = await this.scrapeJobRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`ScrapeJob with ID ${id} not found`);
    }
    return { deleted: true, id };
  }
}
