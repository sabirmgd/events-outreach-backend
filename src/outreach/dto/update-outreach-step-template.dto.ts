import { PartialType } from '@nestjs/mapped-types';
import { CreateOutreachStepTemplateDto } from './create-outreach-step-template.dto';

export class UpdateOutreachStepTemplateDto extends PartialType(
  CreateOutreachStepTemplateDto,
) {}
