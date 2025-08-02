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
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { CreatePersonDto } from './dto/create-person.dto';
import { FindAllPersonasDto } from './dto/find-all-personas.dto';
import { UpdatePersonDto } from './dto/update-person.dto';
import { PersonaService } from './persona.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/dto/jwt-payload.dto';

@Controller('personas')
@UseGuards(JwtAuthGuard)
export class PersonaController {
  constructor(private readonly personaService: PersonaService) {}

  @Post()
  create(
    @Body() createPersonDto: CreatePersonDto,
    @Req() req: { user: JwtPayload },
  ) {
    const { organizationId } = req.user;
    if (!organizationId) {
      throw new ForbiddenException('User is not part of an organization.');
    }
    return this.personaService.create(createPersonDto, organizationId);
  }

  @Get()
  async findAll(
    @Query() findAllPersonasDto: FindAllPersonasDto,
    @Req() req: { user: JwtPayload },
  ) {
    const { organizationId } = req.user;
    if (!organizationId) {
      throw new ForbiddenException('User is not part of an organization.');
    }
    const { data, total } = await this.personaService.findAll(
      findAllPersonasDto,
      organizationId,
    );
    return {
      data,
      pagination: {
        page: findAllPersonasDto.page || 1,
        limit: findAllPersonasDto.limit || 20,
        total,
        pages: Math.ceil(total / (findAllPersonasDto.limit || 20)),
      },
    };
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
