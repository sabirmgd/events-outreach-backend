import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCityDto } from './dto/create-city.dto';
import { CreateVenueDto } from './dto/create-venue.dto';
import { UpdateCityDto } from './dto/update-city.dto';
import { UpdateVenueDto } from './dto/update-venue.dto';
import { City } from './entities/city.entity';
import { Venue } from './entities/venue.entity';

@Injectable()
export class GeographyService {
  constructor(
    @InjectRepository(City)
    private readonly cityRepository: Repository<City>,
    @InjectRepository(Venue)
    private readonly venueRepository: Repository<Venue>,
  ) {}

  // --- City Methods ---
  createCity(createCityDto: CreateCityDto): Promise<City> {
    const city = this.cityRepository.create(createCityDto);
    return this.cityRepository.save(city);
  }

  findAllCities(): Promise<City[]> {
    return this.cityRepository.find();
  }

  async findOneCity(id: number): Promise<City> {
    const city = await this.cityRepository.findOne({ where: { id } });
    if (!city) {
      throw new NotFoundException(`City with ID ${id} not found`);
    }
    return city;
  }

  async updateCity(id: number, updateCityDto: UpdateCityDto): Promise<City> {
    const city = await this.findOneCity(id);
    const updated = this.cityRepository.merge(city, updateCityDto);
    return this.cityRepository.save(updated);
  }

  async removeCity(id: number): Promise<{ deleted: boolean; id?: number }> {
    const result = await this.cityRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`City with ID ${id} not found`);
    }
    return { deleted: true, id };
  }

  // --- Venue Methods ---
  async createVenue(createVenueDto: CreateVenueDto): Promise<Venue> {
    const city = await this.findOneCity(createVenueDto.cityId);
    const venue = this.venueRepository.create({ ...createVenueDto, city });
    return this.venueRepository.save(venue);
  }

  findAllVenues(): Promise<Venue[]> {
    return this.venueRepository.find({ relations: ['city'] });
  }

  async findOneVenue(id: number): Promise<Venue> {
    const venue = await this.venueRepository.findOne({
      where: { id },
      relations: ['city'],
    });
    if (!venue) {
      throw new NotFoundException(`Venue with ID ${id} not found`);
    }
    return venue;
  }

  async updateVenue(
    id: number,
    updateVenueDto: UpdateVenueDto,
  ): Promise<Venue> {
    const venue = await this.findOneVenue(id);
    const updated = this.venueRepository.merge(venue, updateVenueDto);
    return this.venueRepository.save(updated);
  }

  async removeVenue(id: number): Promise<{ deleted: boolean; id?: number }> {
    const result = await this.venueRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Venue with ID ${id} not found`);
    }
    return { deleted: true, id };
  }
}
