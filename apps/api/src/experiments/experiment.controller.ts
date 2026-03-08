import { Controller, Get, Post, Patch, Param, Query, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentWorkspace } from '../auth/decorators';
import { ExperimentService } from './experiment.service';

@Controller('experiments')
@UseGuards(AuthGuard)
export class ExperimentController {
  constructor(private readonly experimentService: ExperimentService) {}

  @Get()
  async list(
    @CurrentWorkspace() workspaceId: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    const data = await this.experimentService.listExperiments(workspaceId, status, limit ? parseInt(limit) : 20);
    return { data };
  }

  @Get('stats')
  async stats(@CurrentWorkspace() workspaceId: string) {
    const data = await this.experimentService.getStats(workspaceId);
    return { data };
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const data = await this.experimentService.getExperiment(id);
    return { data };
  }

  @Post()
  async create(
    @CurrentWorkspace() workspaceId: string,
    @Body() body: { editorialRunId?: string; experimentType: string; hypothesis?: string },
  ) {
    const data = await this.experimentService.createExperiment({
      workspaceId,
      ...body,
    });
    return { data };
  }

  @Post(':id/evaluate')
  async evaluate(@Param('id') id: string) {
    const data = await this.experimentService.evaluateExperiment(id);
    return { data };
  }

  @Patch(':id/cancel')
  async cancel(@Param('id') id: string) {
    const data = await this.experimentService.cancelExperiment(id);
    return { data };
  }

  @Patch('variant/:variantId/link-publication')
  async linkPublication(
    @Param('variantId') variantId: string,
    @Body() body: { publicationId: string },
  ) {
    const data = await this.experimentService.linkPublicationToVariant(variantId, body.publicationId);
    return { data };
  }
}
