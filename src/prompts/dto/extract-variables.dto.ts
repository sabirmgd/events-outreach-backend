import { IsString } from 'class-validator';

export class ExtractVariablesDto {
  @IsString()
  template: string;
}
