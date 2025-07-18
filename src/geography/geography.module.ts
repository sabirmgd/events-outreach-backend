import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { City } from './entities/city.entity';
import { Venue } from './entities/venue.entity';
import { GeographyController } from './geography.controller';
import { GeographyService } from './geography.service';

@Module({
  imports: [TypeOrmModule.forFeature([City, Venue])],
  providers: [GeographyService],
  controllers: [GeographyController],
  exports: [GeographyService],
})
export class GeographyModule {}
