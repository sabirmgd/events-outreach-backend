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
import { CreatePersonDto } from './dto/create-person.dto';
import { FindAllPersonasDto } from './dto/find-all-personas.dto';
import { UpdatePersonDto } from './dto/update-person.dto';
import { PersonaService } from './persona.service';

@Controller('personas')
export class PersonaController {
  constructor(private readonly personaService: PersonaService) {}

  @Post()
  create(@Body() createPersonDto: CreatePersonDto) {
    return this.personaService.create(createPersonDto);
  }

  @Get()
  findAll(@Query() findAllPersonasDto: FindAllPersonasDto) {
    return this.personaService.findAll(findAllPersonasDto);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query('relations') relations: string[],
  ) {
    return this.personaService.findOne(id, relations);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePersonDto: UpdatePersonDto,
  ) {
    return this.personaService.update(id, updatePersonDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.personaService.remove(id);
  }

  @Post(':id/roles/:companyId')
  addRole(
    @Param('id', ParseIntPipe) id: number,
    @Param('companyId', ParseIntPipe) companyId: number,
    @Body('role_title') role_title: string,
  ) {
    return this.personaService.addRole(id, companyId, role_title);
  }

  @Post('roles/:id/classify')
  classifyRole(@Param('id', ParseIntPipe) id: number) {
    return this.personaService.classifyRole(id);
  }
}
