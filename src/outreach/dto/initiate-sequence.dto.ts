import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
} from 'class-validator';

export class InitiateSequenceDto {
  @IsNotEmpty()
  @IsString()
  signalId: string;

  @IsNotEmpty()
  @IsString()
  sequenceId: string;

  @IsArray()
  @IsString({ each: true })
  personIds: string[];

  @IsOptional()
  @IsBoolean()
  sendImmediately?: boolean; // For testing - sends without delay
}
