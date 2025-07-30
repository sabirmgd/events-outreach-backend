import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { EvaluationService } from '../services/evaluation.service';
import { RunEvaluationDto, ComparePromptsDto } from '../dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/auth/guards/permissions.guard';
import { RequirePermissions } from '@/auth/decorators/permissions.decorator';
import { Permission } from '@/auth/enums/permission.enum';

@Controller('prompts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class EvaluationController {
  constructor(private readonly evaluationService: EvaluationService) {}

  @Post(':id/evaluate')
  @RequirePermissions(Permission.PROMPTS_EVALUATE)
  async runEvaluation(
    @Param('id') promptId: string,
    @Body() dto: RunEvaluationDto,
  ) {
    return await this.evaluationService.runEvaluation(promptId, dto);
  }

  @Get(':id/evaluations')
  @RequirePermissions(Permission.PROMPTS_READ)
  async getEvaluations(@Param('id') promptId: string) {
    return await this.evaluationService.getEvaluations(promptId);
  }

  @Get(':id/evaluations/metrics')
  @RequirePermissions(Permission.PROMPTS_READ)
  async getEvaluationMetrics(@Param('id') promptId: string) {
    return await this.evaluationService.getEvaluationMetrics(promptId);
  }

  @Get('evaluations/:evaluationId')
  @RequirePermissions(Permission.PROMPTS_READ)
  async getEvaluation(@Param('evaluationId') evaluationId: string) {
    return await this.evaluationService.getEvaluation(evaluationId);
  }

  @Post('compare')
  @RequirePermissions(Permission.PROMPTS_EVALUATE)
  async comparePrompts(@Body() dto: ComparePromptsDto) {
    return await this.evaluationService.comparePrompts(dto);
  }
}
