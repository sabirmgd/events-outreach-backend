import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Prompt,
  PromptVersion,
  PromptTag,
  PromptEvaluation,
  PromptTestCase,
} from './entities';
import { PromptsService } from './services/prompts.service';
import { EvaluationService } from './services/evaluation.service';
import { PromptsController } from './controllers/prompts.controller';
import { EvaluationController } from './controllers/evaluation.controller';
import { EvaluationGateway } from './gateways/evaluation.gateway';
import { AuthModule } from '@/auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Prompt,
      PromptVersion,
      PromptTag,
      PromptEvaluation,
      PromptTestCase,
    ]),
    forwardRef(() => AuthModule),
  ],
  controllers: [PromptsController, EvaluationController],
  providers: [PromptsService, EvaluationService, EvaluationGateway],
  exports: [PromptsService, EvaluationService],
})
export class PromptsModule {}
