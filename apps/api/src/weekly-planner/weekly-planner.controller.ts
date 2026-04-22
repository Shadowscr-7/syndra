import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { PlanLimitsGuard, RequireFeature } from '../plans/plan-limits.guard';
import { BackgroundTasksService } from '../media/background-tasks.service';
import { WeeklyPlannerService } from './weekly-planner.service';

@Controller('weekly-planner')
@UseGuards(AuthGuard, PlanLimitsGuard)
@RequireFeature('weeklyPlanner')
export class WeeklyPlannerController {
  constructor(
    private readonly weeklyPlanner: WeeklyPlannerService,
    private readonly backgroundTasks: BackgroundTasksService,
  ) {}

  // ── Config CRUD ──────────────────────────────────────

  @Get('configs')
  async getConfigs(@Req() req: any) {
    const data = await this.weeklyPlanner.getConfigs(req.workspaceId);
    return { data };
  }

  @Post('configs')
  async createConfig(@Req() req: any, @Body() body: any) {
    const data = await this.weeklyPlanner.createConfig(req.workspaceId, body);
    return { data };
  }

  @Put('configs/:id')
  async updateConfig(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    const data = await this.weeklyPlanner.updateConfig(id, req.workspaceId, body);
    return { data };
  }

  @Delete('configs/:id')
  async deleteConfig(@Req() req: any, @Param('id') id: string) {
    await this.weeklyPlanner.deleteConfig(id, req.workspaceId);
    return { data: { deleted: true } };
  }

  // ── Batches ──────────────────────────────────────────

  @Get('approvals')
  async getApprovals(@Req() req: any, @Query('status') status?: string) {
    const data = await this.weeklyPlanner.getApprovals(req.workspaceId, status);
    return { data };
  }

  @Get('approvals/count')
  async countPendingApprovals(@Req() req: any) {
    const count = await this.weeklyPlanner.countPendingApprovals(req.workspaceId);
    return { data: { count } };
  }

  @Get('batches')
  async getBatches(@Req() req: any, @Query('limit') limit?: string) {
    const data = await this.weeklyPlanner.getBatches(
      req.workspaceId,
      limit ? parseInt(limit, 10) : 10,
    );
    return { data };
  }

  @Get('batches/:id')
  async getBatch(@Req() req: any, @Param('id') id: string) {
    const data = await this.weeklyPlanner.getBatch(id, req.workspaceId);
    return { data };
  }

  @Get('configs/:id/estimate-cost')
  async estimateBatchCost(@Req() req: any, @Param('id') id: string) {
    const data = await this.weeklyPlanner.estimateBatchCost(id);
    return { data };
  }

  @Post('batches/generate/:configId')
  async generateBatch(
    @Param('configId') configId: string,
    @Body() body: { skipMusic?: boolean },
  ) {
    const batchId = await this.weeklyPlanner.generateBatch(configId, body?.skipMusic);
    return { data: { batchId } };
  }

  @Post('batches/:id/retry')
  async retryBatch(@Req() req: any, @Param('id') id: string) {
    const data = await this.weeklyPlanner.retryBatch(id, req.workspaceId);
    return { data };
  }

  @Post('batches/:id/cancel')
  async cancelBatch(@Req() req: any, @Param('id') id: string) {
    const data = await this.weeklyPlanner.cancelBatch(id, req.workspaceId);
    return { data };
  }

  @Delete('batches/:id')
  async deleteBatch(@Req() req: any, @Param('id') id: string) {
    const data = await this.weeklyPlanner.deleteBatch(id, req.workspaceId);
    return { data };
  }

  // ── Approve / Reject ────────────────────────────────

  @Post('batches/:id/approve-all')
  async approveAll(@Req() req: any, @Param('id') id: string) {
    await this.weeklyPlanner.approveAll(id, req.workspaceId);
    return { data: { status: 'approved' } };
  }

  @Post('items/:id/approve')
  async approveItem(@Req() req: any, @Param('id') id: string) {
    await this.weeklyPlanner.approveItem(id, req.workspaceId);
    return { data: { status: 'approved' } };
  }

  @Post('items/:id/reject')
  async rejectItem(@Req() req: any, @Param('id') id: string) {
    await this.weeklyPlanner.rejectItem(id, req.workspaceId);
    return { data: { status: 'rejected' } };
  }

  // ── Item Actions ────────────────────────────────────

  @Post('items/:id/edit-text')
  async editText(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { feedback: string },
  ) {
    const data = await this.weeklyPlanner.editText(id, req.workspaceId, body.feedback);
    return { data };
  }

  @Post('items/:id/rewrite')
  async rewriteText(@Req() req: any, @Param('id') id: string) {
    const data = await this.weeklyPlanner.rewriteText(id, req.workspaceId);
    return { data };
  }

  @Post('items/:id/change-tone')
  async changeTone(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { tone: string },
  ) {
    const data = await this.weeklyPlanner.changeTone(id, req.workspaceId, body.tone);
    return { data };
  }

  @Post('items/:id/regenerate-image')
  async regenerateImage(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { customPrompt?: string },
  ) {
    const data = await this.weeklyPlanner.regenerateImage(id, req.workspaceId, body.customPrompt);
    return { data };
  }

  @Post('items/:id/regenerate-image-pro')
  async regenerateImagePro(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { customPrompt?: string; model?: string },
  ) {
    const modelLabel = body.model
      ? (body.model.includes('/') ? body.model.split('/').pop() : body.model)
      : 'Ideogram V3';
    const taskId = this.backgroundTasks.createTask({
      type: 'image-pro',
      label: `Regeneración Pro (${modelLabel})`,
      workspaceId: req.workspaceId,
    });

    this.weeklyPlanner
      .regenerateImagePro(id, req.workspaceId, body.customPrompt, body.model)
      .then((result) => this.backgroundTasks.completeTask(taskId, result))
      .catch((err) => this.backgroundTasks.failTask(taskId, err.message ?? 'Error desconocido'));

    return { data: { taskId } };
  }

  @Post('items/:id/generate-music')
  async generateMusic(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { style?: string; prompt?: string },
  ) {
    const taskId = this.backgroundTasks.createTask({
      type: 'music',
      label: `Generando música: ${body.style ?? 'upbeat'}`,
      workspaceId: req.workspaceId,
    });

    // Fire and forget — runs in background
    this.weeklyPlanner
      .generateMusic(id, req.workspaceId, body.style, body.prompt)
      .then((result) => this.backgroundTasks.completeTask(taskId, result))
      .catch((err) => this.backgroundTasks.failTask(taskId, err.message ?? 'Error desconocido'));

    return { data: { taskId } };
  }

  // ── Background Tasks ────────────────────────────────

  @Get('tasks')
  async getTasks(@Req() req: any) {
    const tasks = this.backgroundTasks.getTasksByWorkspace(req.workspaceId);
    return { data: tasks };
  }

  @Get('tasks/:taskId')
  async getTaskStatus(@Req() req: any, @Param('taskId') taskId: string) {
    const task = this.backgroundTasks.getTask(taskId);
    if (!task || task.workspaceId !== req.workspaceId) {
      return { data: null };
    }
    return { data: task };
  }

  @Post('items/:id/change-format')
  async changeFormat(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { format: string },
  ) {
    const data = await this.weeklyPlanner.changeFormat(id, req.workspaceId, body.format);
    return { data };
  }

  @Post('items/:id/replace-image')
  async replaceImage(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { imageUrl: string },
  ) {
    const data = await this.weeklyPlanner.replaceImage(id, req.workspaceId, body.imageUrl);
    return { data };
  }

  @Post('items/:id/convert-video')
  async convertToVideo(@Req() req: any, @Param('id') id: string, @Body() body: { type?: string; slideCount?: number; voiceGender?: 'female' | 'male' }) {
    const data = await this.weeklyPlanner.convertToVideo(id, req.workspaceId, body?.type as any, body?.slideCount, body?.voiceGender);
    return { data };
  }

  @Post('items/:id/redo')
  async redoItem(@Req() req: any, @Param('id') id: string) {
    const data = await this.weeklyPlanner.redoItem(id, req.workspaceId);
    return { data };
  }
}
