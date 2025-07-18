import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from './entities/company.entity';
import { CompanySource } from './entities/company-source.entity';
import { CompanyTag } from './entities/company-tag.entity';
import { CompanySimilarity } from './entities/company-similarity.entity';
import { CompanyController } from './company.controller';
import { CompanyService } from './company.service';
import { GeographyModule } from '../geography/geography.module';
import { PersonaModule } from '../persona/persona.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Company,
      CompanySource,
      CompanyTag,
      CompanySimilarity,
    ]),
    GeographyModule,
    forwardRef(() => PersonaModule),
  ],
  providers: [CompanyService],
  controllers: [CompanyController],
  exports: [CompanyService],
})
export class CompanyModule {}
