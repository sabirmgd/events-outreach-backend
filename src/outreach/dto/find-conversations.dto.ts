import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ConversationStage } from '../enums/conversation-stage.enum';
import { ProspectTemperature } from '../enums/prospect-temperature.enum';
import { ConversationAutomationStatus } from '../enums/conversation-automation-status.enum';

export class FindConversationsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(ConversationStage)
  stage?: ConversationStage;

  @IsOptional()
  @IsEnum(ProspectTemperature)
  temperature?: ProspectTemperature;

  @IsOptional()
  @IsEnum(ConversationAutomationStatus)
  automationStatus?: ConversationAutomationStatus;

  @IsOptional()
  @IsString()
  personaId?: string;
}
