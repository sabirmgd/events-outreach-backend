import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { SignalService } from './signal.service';
import { SignalExecutionService } from './signal-execution.service';
import { CreateSignalDto } from './dto/create-signal.dto';
import { UpdateSignalDto } from './dto/update-signal.dto';
import { FindSignalsDto } from './dto/find-signals.dto';
import { ExecuteSignalDto } from './dto/execute-signal.dto';
import { DiscoverSignalDto } from './dto/discover-signal.dto';

@ApiTags('signals')
@Controller('signals')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SignalController {
  constructor(
    private readonly signalService: SignalService,
    private readonly executionService: SignalExecutionService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new signal' })
  async create(@Body() createSignalDto: CreateSignalDto, @Request() req: any) {
    return await this.signalService.create(createSignalDto, req.user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'List all signals' })
  async findAll(@Query() query: FindSignalsDto) {
    const { data, total } = await this.signalService.findAll(query);
    
    return {
      data,
      pagination: {
        page: query.page || 1,
        limit: query.limit || 20,
        total,
        pages: Math.ceil(total / (query.limit || 20)),
      },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get signal details' })
  async findOne(@Param('id') id: string) {
    return await this.signalService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a signal' })
  async update(@Param('id') id: string, @Body() updateSignalDto: UpdateSignalDto) {
    return await this.signalService.update(id, updateSignalDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a signal' })
  async remove(@Param('id') id: string) {
    await this.signalService.remove(id);
    return { message: 'Signal deleted successfully' };
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Activate a signal' })
  async activate(@Param('id') id: string) {
    return await this.signalService.activate(id);
  }

  @Post(':id/pause')
  @ApiOperation({ summary: 'Pause a signal' })
  async pause(@Param('id') id: string) {
    return await this.signalService.pause(id);
  }

  @Post(':id/execute')
  @ApiOperation({ summary: 'Manually execute a signal' })
  async execute(
    @Param('id') id: string,
    @Body() dto: ExecuteSignalDto,
    @Request() req: any,
  ) {
    const execution = await this.executionService.executeSignal(
      id,
      req.user.userId,
      dto,
    );
    
    return {
      execution_id: execution.id,
      status: execution.status,
      estimated_completion: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes estimate
    };
  }

  @Get(':id/executions')
  @ApiOperation({ summary: 'Get execution history for a signal' })
  async getExecutions(
    @Param('id') id: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return await this.executionService.getSignalExecutions(id, page, limit);
  }

  @Get(':id/execution-data')
  @ApiOperation({ summary: 'Get real-time execution data for a signal' })
  async getExecutionData(@Param('id') id: string) {
    return await this.signalService.getExecutionData(id);
  }

  @Post('discover')
  @ApiOperation({ summary: 'Discover signals from natural language' })
  async discover(@Body() dto: DiscoverSignalDto) {
    return await this.executionService.discoverSignal(dto);
  }

  @Get('executions/active')
  @ApiOperation({ summary: 'Get all active executions' })
  async getActiveExecutions() {
    return await this.executionService.getActiveExecutions();
  }

  @Get('executions/:executionId')
  @ApiOperation({ summary: 'Get execution details' })
  async getExecution(@Param('executionId') executionId: string) {
    return await this.executionService.getExecution(executionId);
  }

  @Delete('executions/:executionId')
  @ApiOperation({ summary: 'Cancel an execution' })
  async cancelExecution(@Param('executionId') executionId: string) {
    const cancelled = await this.executionService.cancelExecution(executionId);
    
    if (!cancelled) {
      return { message: 'Execution not found or already completed' };
    }
    
    return { message: 'Execution cancelled successfully' };
  }
}