import { IsArray, IsObject, ArrayMinSize, IsUUID } from 'class-validator';

export class ComparePromptsDto {
  @IsArray()
  @ArrayMinSize(2)
  @IsUUID('4', { each: true })
  promptIds: string[];

  @IsObject()
  input: Record<string, any>;

  @IsObject()
  variables: Record<string, any>;
}
