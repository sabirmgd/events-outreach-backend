import { PartialType } from '@nestjs/mapped-types';
import { CreateOutreachSequenceDto } from './create-outreach-sequence.dto';

export class UpdateOutreachSequenceDto extends PartialType(
  CreateOutreachSequenceDto,
) {}
