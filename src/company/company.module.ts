import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { Company } from './entities/company.entity';
import { CompanySource } from './entities/company-source.entity';
import { CompanyTag } from './entities/company-tag.entity';
import { CompanySimilarity } from './entities/company-similarity.entity';
import { CompanyController } from './company.controller';
import { CompanyService } from './company.service';
import { GeographyModule } from '../geography/geography.module';
import { PersonaModule } from '../persona/persona.module';
import { ENRICHMENT_QUEUE } from '../queue/constants';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Company,
      CompanySource,
      CompanyTag,
      CompanySimilarity,
    ]),
    BullModule.registerQueue({ name: ENRICHMENT_QUEUE }),
    GeographyModule,
    forwardRef(() => PersonaModule),
  ],
  providers: [CompanyService],
  controllers: [CompanyController],
  exports: [CompanyService],
})
export class CompanyModule {}
