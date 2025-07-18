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
import { CreateCityDto } from './dto/create-city.dto';
import { CreateVenueDto } from './dto/create-venue.dto';
import { UpdateCityDto } from './dto/update-city.dto';
import { UpdateVenueDto } from './dto/update-venue.dto';
import { GeographyService } from './geography.service';

@Controller('geography')
export class GeographyController {
  constructor(private readonly geographyService: GeographyService) {}

  // --- Cities Endpoints ---
  @Post('cities')
  createCity(@Body() createCityDto: CreateCityDto) {
    return this.geographyService.createCity(createCityDto);
  }

  @Get('cities')
  findAllCities() {
    return this.geographyService.findAllCities();
  }

  @Get('cities/:id')
  findOneCity(@Param('id', ParseIntPipe) id: number) {
    return this.geographyService.findOneCity(id);
  }

  @Patch('cities/:id')
  updateCity(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCityDto: UpdateCityDto,
  ) {
    return this.geographyService.updateCity(id, updateCityDto);
  }

  @Delete('cities/:id')
  removeCity(@Param('id', ParseIntPipe) id: number) {
    return this.geographyService.removeCity(id);
  }

  // --- Venues Endpoints ---
  @Post('venues')
  createVenue(@Body() createVenueDto: CreateVenueDto) {
    return this.geographyService.createVenue(createVenueDto);
  }

  @Get('venues')
  findAllVenues() {
    return this.geographyService.findAllVenues();
  }

  @Get('venues/:id')
  findOneVenue(@Param('id', ParseIntPipe) id: number) {
    return this.geographyService.findOneVenue(id);
  }

  @Patch('venues/:id')
  updateVenue(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateVenueDto: UpdateVenueDto,
  ) {
    return this.geographyService.updateVenue(id, updateVenueDto);
  }

  @Delete('venues/:id')
  removeVenue(@Param('id', ParseIntPipe) id: number) {
    return this.geographyService.removeVenue(id);
  }
}
