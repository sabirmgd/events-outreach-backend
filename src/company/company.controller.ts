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
import { CreateCompanyDto } from './dto/create-company.dto';
import { FindAllCompaniesDto } from './dto/find-all-companies.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CompanyService } from './company.service';
import { PersonaService } from '../persona/persona.service';

@Controller('companies')
export class CompanyController {
  constructor(
    private readonly companyService: CompanyService,
    private readonly personaService: PersonaService,
  ) {}

  @Post(':id/discover-personas')
  discoverPersonas(@Param('id', ParseIntPipe) id: number) {
    return this.personaService.discoverPersonas(id);
  }

  @Post(':id/enrich')
  enrich(@Param('id', ParseIntPipe) id: number) {
    return this.companyService.enrich(id);
  }

  @Post()
  create(@Body() createCompanyDto: CreateCompanyDto) {
    return this.companyService.create(createCompanyDto);
  }

  @Get()
  findAll(@Query() findAllCompaniesDto: FindAllCompaniesDto) {
    return this.companyService.findAll(findAllCompaniesDto);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query('relations') relations: string[],
  ) {
    return this.companyService.findOne(id, relations);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCompanyDto: UpdateCompanyDto,
  ) {
    return this.companyService.update(id, updateCompanyDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.companyService.remove(id);
  }
}
