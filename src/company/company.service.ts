import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { GeographyService } from '../geography/geography.service';
import { ENRICHMENT_QUEUE } from '../queue/constants';
import { CreateCompanyDto } from './dto/create-company.dto';
import { FindAllCompaniesDto } from './dto/find-all-companies.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { Company } from './entities/company.entity';

@Injectable()
export class CompanyService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    private readonly geographyService: GeographyService,
    @InjectQueue(ENRICHMENT_QUEUE) private readonly enrichmentQueue: Queue,
  ) {}

  async enrich(id: number) {
    const company = await this.findOne(id);
    const job = await this.enrichmentQueue.add('company', {
      companyId: company.id,
    });
    return { jobId: job.id };
  }

  async create(createCompanyDto: CreateCompanyDto): Promise<Company> {
    const { hq_city_id, ...rest } = createCompanyDto;
    let hq_city;
    if (hq_city_id) {
      hq_city = await this.geographyService.findOneCity(hq_city_id);
    }

    const company = this.companyRepository.create({ ...rest, hq_city });
    return this.companyRepository.save(company);
  }

  findAll(findAllCompaniesDto: FindAllCompaniesDto): Promise<Company[]> {
    return this.companyRepository.find({
      relations: findAllCompaniesDto.relations || ['hq_city'],
    });
  }

  async findOne(id: number, relations: string[] = []): Promise<Company> {
    const company = await this.companyRepository.findOne({
      where: { id },
      relations: relations.length ? relations : ['hq_city'],
    });
    if (!company) {
      throw new NotFoundException(`Company with ID ${id} not found`);
    }
    return company;
  }

  async update(
    id: number,
    updateCompanyDto: UpdateCompanyDto,
  ): Promise<Company> {
    const { hq_city_id, ...rest } = updateCompanyDto;
    const company = await this.findOne(id);

    let hq_city;
    if (hq_city_id) {
      hq_city = await this.geographyService.findOneCity(hq_city_id);
    }

    const updated = this.companyRepository.merge(company, { ...rest, hq_city });
    return this.companyRepository.save(updated);
  }

  async remove(id: number): Promise<{ deleted: boolean; id?: number }> {
    const result = await this.companyRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Company with ID ${id} not found`);
    }
    return { deleted: true, id };
  }

  async findByName(name: string): Promise<Company | null> {
    return await this.companyRepository
      .createQueryBuilder('company')
      .where('LOWER(company.name) = LOWER(:name)', { name: name.trim() })
      .getOne();
  }

  async findByWebsite(website: string): Promise<Company | null> {
    return await this.companyRepository
      .createQueryBuilder('company')
      .where('LOWER(company.website) = LOWER(:website)', {
        website: website.trim(),
      })
      .getOne();
  }
}
