import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentWorkspace } from '../auth/decorators';
import { BrandMemoryService } from './brand-memory.service';

@Controller('brand-memory')
@UseGuards(AuthGuard)
export class BrandMemoryController {
  constructor(private readonly memoryService: BrandMemoryService) {}

  @Get()
  async getMemory(@CurrentWorkspace() workspaceId: string) {
    const data = await this.memoryService.getBrandMemory(workspaceId);
    return { data };
  }

  @Get('fatigue')
  async getFatigue(
    @CurrentWorkspace() workspaceId: string,
    @Query('dimensionType') dimensionType?: string,
  ) {
    const data = await this.memoryService.getFatigueScores(workspaceId, dimensionType);
    return { data };
  }

  @Get('fatigue/high')
  async getHighFatigue(
    @CurrentWorkspace() workspaceId: string,
    @Query('threshold') threshold?: string,
  ) {
    const data = await this.memoryService.getHighFatigueItems(
      workspaceId,
      threshold ? parseFloat(threshold) : 60,
    );
    return { data };
  }

  @Post('analyze')
  async analyze(@CurrentWorkspace() workspaceId: string) {
    const data = await this.memoryService.analyzeWorkspace(workspaceId);
    return { data };
  }
}
