import { Controller, Get, Post, Param } from '@nestjs/common';
import { ChurnDetectionService } from './churn-detection.service';
import { Roles } from '../auth/decorators';

@Controller('admin/churn')
export class ChurnController {
  constructor(private readonly churn: ChurnDetectionService) {}

  @Roles('ADMIN')
  @Get()
  async getAllSignals() {
    const data = await this.churn.getAllSignals();
    return { data };
  }

  @Roles('ADMIN')
  @Get('at-risk')
  async getAtRisk() {
    const count = await this.churn.getAtRiskCount();
    return { data: { count } };
  }

  @Roles('ADMIN')
  @Post('evaluate')
  async evaluateAll() {
    await this.churn.evaluateAll();
    return { data: { message: 'Churn evaluation completed' } };
  }

  @Roles('ADMIN')
  @Post('evaluate/:workspaceId')
  async evaluateOne(@Param('workspaceId') workspaceId: string) {
    const signal = await this.churn.evaluateWorkspace(workspaceId);
    return { data: signal };
  }
}
