import { IsNotEmpty, IsString, IsNumber } from 'class-validator';

export class HandleReplyDto {
  @IsNumber()
  @IsNotEmpty()
  conversationId: number;

  @IsString()
  @IsNotEmpty()
  messageContent: string;
}
