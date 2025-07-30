import {
  Injectable,
  NotFoundException,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PromptEvaluation,
  EvaluationStatus,
} from '../entities/prompt-evaluation.entity';
import { PromptsService } from './prompts.service';
import { RunEvaluationDto, ComparePromptsDto } from '../dto';
import { VariableExtractor } from '../utils/variable-extractor';
// import { EventEmitter2 } from '@nestjs/event-emitter'; // Not used currently

export interface EvaluationProgress {
  evaluationId: string;
  status: EvaluationStatus;
  progress: number;
  message?: string;
  error?: string;
}

@Injectable()
export class EvaluationService {
  constructor(
    @InjectRepository(PromptEvaluation)
    private evaluationRepository: Repository<PromptEvaluation>,
    @Inject(forwardRef(() => PromptsService))
    private promptsService: PromptsService,
    // private eventEmitter: EventEmitter2, // Not used currently
  ) {}

  async runEvaluation(
    promptId: string,
    dto: RunEvaluationDto,
  ): Promise<PromptEvaluation> {
    const prompt = await this.promptsService.findOne(promptId);

    // Get version to evaluate
    let versionId = dto.versionId;
    if (!versionId) {
      const publishedVersion =
        await this.promptsService.getPublishedVersion(promptId);
      if (!publishedVersion) {
        throw new NotFoundException(
          'No published version found for this prompt',
        );
      }
      versionId = publishedVersion.id;
    }

    const version = await this.promptsService.getVersion(promptId, versionId);

    // Create evaluation record
    const evaluation = this.evaluationRepository.create({
      promptId,
      versionId,
      status: EvaluationStatus.PENDING,
      input: dto.input,
      variables: dto.variables || {},
      agentId: dto.agentId || prompt.agentId,
      agentMethodName: dto.agentMethodName || prompt.agentMethodName,
    });

    const savedEvaluation = await this.evaluationRepository.save(evaluation);

    // Start async evaluation
    void this.executeEvaluation(savedEvaluation, version.body);

    return savedEvaluation;
  }

  private async executeEvaluation(
    evaluation: PromptEvaluation,
    promptBody: string,
  ): Promise<void> {
    try {
      // Update status to running
      evaluation.status = EvaluationStatus.RUNNING;
      await this.evaluationRepository.save(evaluation);

      // Emit progress event
      this.emitProgress(evaluation.id, {
        evaluationId: evaluation.id,
        status: EvaluationStatus.RUNNING,
        progress: 10,
        message: 'Starting evaluation',
      });

      // Interpolate variables into prompt
      const interpolatedPrompt = VariableExtractor.interpolateVariables(
        promptBody,
        evaluation.variables,
      );

      this.emitProgress(evaluation.id, {
        evaluationId: evaluation.id,
        status: EvaluationStatus.RUNNING,
        progress: 30,
        message: 'Variables interpolated',
      });

      // Here you would integrate with the actual agent execution
      // For now, we'll simulate it
      const startTime = Date.now();

      // Simulate agent execution
      await new Promise((resolve) => setTimeout(resolve, 2000));

      this.emitProgress(evaluation.id, {
        evaluationId: evaluation.id,
        status: EvaluationStatus.RUNNING,
        progress: 70,
        message: 'Agent execution completed',
      });

      const executionTime = Date.now() - startTime;

      // Mock output for now
      const output = {
        result: 'Mock evaluation result',
        interpolatedPrompt,
        timestamp: new Date().toISOString(),
      };

      // Update evaluation with results
      evaluation.status = EvaluationStatus.COMPLETED;
      evaluation.output = output;
      evaluation.executionTime = executionTime;
      evaluation.tokenCount = Math.floor(interpolatedPrompt.length / 4); // Rough estimate
      evaluation.cost = evaluation.tokenCount * 0.00001; // Mock cost calculation
      evaluation.qualityScore = Math.random() * 100; // Mock quality score

      await this.evaluationRepository.save(evaluation);

      this.emitProgress(evaluation.id, {
        evaluationId: evaluation.id,
        status: EvaluationStatus.COMPLETED,
        progress: 100,
        message: 'Evaluation completed successfully',
      });
    } catch (error) {
      // Handle errors
      evaluation.status = EvaluationStatus.FAILED;
      evaluation.error = error.message;
      await this.evaluationRepository.save(evaluation);

      this.emitProgress(evaluation.id, {
        evaluationId: evaluation.id,
        status: EvaluationStatus.FAILED,
        progress: 0,
        error: error.message,
      });
    }
  }

  async getEvaluations(promptId: string): Promise<PromptEvaluation[]> {
    await this.promptsService.findOne(promptId); // Ensure prompt exists

    return await this.evaluationRepository.find({
      where: { promptId },
      relations: ['version'],
      order: { createdAt: 'DESC' },
    });
  }

  async getEvaluation(evaluationId: string): Promise<PromptEvaluation> {
    const evaluation = await this.evaluationRepository.findOne({
      where: { id: evaluationId },
      relations: ['prompt', 'version'],
    });

    if (!evaluation) {
      throw new NotFoundException(`Evaluation '${evaluationId}' not found`);
    }

    return evaluation;
  }

  async comparePrompts(dto: ComparePromptsDto): Promise<{
    comparisons: Array<{
      promptId: string;
      evaluation: PromptEvaluation;
    }>;
    winner?: string;
    metrics: {
      executionTime: { [promptId: string]: number };
      tokenCount: { [promptId: string]: number };
      cost: { [promptId: string]: number };
      qualityScore: { [promptId: string]: number };
    };
  }> {
    const evaluations = await Promise.all(
      dto.promptIds.map((promptId) =>
        this.runEvaluation(promptId, {
          input: dto.input,
          variables: dto.variables,
        }),
      ),
    );

    // Wait for all evaluations to complete
    await Promise.all(
      evaluations.map((evaluation) => this.waitForCompletion(evaluation.id)),
    );

    // Fetch completed evaluations
    const completedEvaluations = await Promise.all(
      evaluations.map((evaluation) => this.getEvaluation(evaluation.id)),
    );

    // Calculate metrics
    const metrics = {
      executionTime: {} as Record<string, number>,
      tokenCount: {} as Record<string, number>,
      cost: {} as Record<string, number>,
      qualityScore: {} as Record<string, number>,
    };

    const comparisons = completedEvaluations.map((evaluation, index) => {
      const promptId = dto.promptIds[index];
      metrics.executionTime[promptId] = evaluation.executionTime || 0;
      metrics.tokenCount[promptId] = evaluation.tokenCount || 0;
      metrics.cost[promptId] = evaluation.cost || 0;
      metrics.qualityScore[promptId] = evaluation.qualityScore || 0;

      return {
        promptId,
        evaluation,
      };
    });

    // Determine winner based on quality score
    let winner: string | undefined;
    let highestScore = 0;

    Object.entries(metrics.qualityScore).forEach(([promptId, score]) => {
      if (typeof score === 'number' && score > highestScore) {
        highestScore = score;
        winner = promptId;
      }
    });

    return {
      comparisons,
      winner,
      metrics,
    };
  }

  private async waitForCompletion(evaluationId: string): Promise<void> {
    const maxAttempts = 60; // 1 minute timeout
    let attempts = 0;

    while (attempts < maxAttempts) {
      const evaluation = await this.getEvaluation(evaluationId);

      if (
        evaluation.status === EvaluationStatus.COMPLETED ||
        evaluation.status === EvaluationStatus.FAILED
      ) {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
      attempts++;
    }

    throw new Error(`Evaluation ${evaluationId} timed out`);
  }

  private emitProgress(
    evaluationId: string,
    progress: EvaluationProgress,
  ): void {
    // this.eventEmitter.emit('evaluation.progress', progress);
  }

  async getEvaluationMetrics(promptId: string): Promise<{
    totalEvaluations: number;
    averageExecutionTime: number;
    averageTokenCount: number;
    averageCost: number;
    averageQualityScore: number;
    successRate: number;
  }> {
    const evaluations = await this.getEvaluations(promptId);

    if (evaluations.length === 0) {
      return {
        totalEvaluations: 0,
        averageExecutionTime: 0,
        averageTokenCount: 0,
        averageCost: 0,
        averageQualityScore: 0,
        successRate: 0,
      };
    }

    const completedEvaluations = evaluations.filter(
      (e) => e.status === EvaluationStatus.COMPLETED,
    );

    const totalEvaluations = evaluations.length;
    const successRate = (completedEvaluations.length / totalEvaluations) * 100;

    const averageExecutionTime =
      completedEvaluations.reduce((sum, e) => sum + (e.executionTime || 0), 0) /
      completedEvaluations.length;

    const averageTokenCount =
      completedEvaluations.reduce((sum, e) => sum + (e.tokenCount || 0), 0) /
      completedEvaluations.length;

    const averageCost =
      completedEvaluations.reduce((sum, e) => sum + (e.cost || 0), 0) /
      completedEvaluations.length;

    const averageQualityScore =
      completedEvaluations.reduce((sum, e) => sum + (e.qualityScore || 0), 0) /
      completedEvaluations.length;

    return {
      totalEvaluations,
      averageExecutionTime,
      averageTokenCount,
      averageCost,
      averageQualityScore,
      successRate,
    };
  }
}
