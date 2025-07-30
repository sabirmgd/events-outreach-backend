import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreatePromptDto } from './create-prompt.dto';

export class UpdatePromptDto extends PartialType(
  OmitType(CreatePromptDto, ['key', 'body'] as const),
) {}
