// ============================================================
// ReferenceCopyController — Biblioteca de copies de referencia
// ============================================================

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { ReferenceCopyService } from './reference-copy.service';

interface CreateReferenceCopyDto {
  title?: string;
  body: string;
  type: 'AD_PAID' | 'ORGANIC' | 'EMAIL' | 'CAPTION' | 'STORY' | 'OTHER';
  platform?: string;
  tags?: string[];
  notes?: string;
}

@Controller('reference-copy')
@UseGuards(AuthGuard)
export class ReferenceCopyController {
  constructor(private readonly svc: ReferenceCopyService) {}

  /** GET /api/reference-copy — List all copies for workspace */
  @Get()
  async list(@Req() req: any) {
    const workspaceId = req.workspaceId ?? req.query?.workspaceId;
    if (!workspaceId) return { data: [] };
    return { data: await this.svc.list(workspaceId) };
  }

  /** POST /api/reference-copy — Create new copy */
  @Post()
  async create(@Req() req: any, @Body() body: CreateReferenceCopyDto) {
    const workspaceId = req.workspaceId ?? req.body?.workspaceId;
    if (!workspaceId) return { error: 'workspaceId required' };
    return { data: await this.svc.create(workspaceId, body) };
  }

  /** POST /api/reference-copy/analyze-all — Analyze all unanalyzed + update BrandMemory */
  // IMPORTANT: must be declared before /:id to avoid param collision
  @Post('analyze-all')
  async analyzeAll(@Req() req: any) {
    const workspaceId = req.workspaceId ?? req.body?.workspaceId;
    if (!workspaceId) return { error: 'workspaceId required' };
    return { data: await this.svc.analyzeAll(workspaceId) };
  }

  /** POST /api/reference-copy/:id/analyze — Analyze single copy */
  @Post(':id/analyze')
  async analyzeOne(@Req() req: any, @Param('id') id: string) {
    const workspaceId = req.workspaceId ?? req.body?.workspaceId;
    if (!workspaceId) return { error: 'workspaceId required' };
    const result = await this.svc.analyzeOne(workspaceId, id);
    if (!result) throw new NotFoundException(`ReferenceCopy ${id} not found`);
    return { data: result };
  }

  /** PATCH /api/reference-copy/:id — Update copy */
  @Patch(':id')
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: Partial<CreateReferenceCopyDto>,
  ) {
    const workspaceId = req.workspaceId ?? req.body?.workspaceId;
    if (!workspaceId) return { error: 'workspaceId required' };
    return { data: await this.svc.update(workspaceId, id, body) };
  }

  /** DELETE /api/reference-copy/:id — Delete copy */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Req() req: any, @Param('id') id: string) {
    const workspaceId = req.workspaceId ?? req.body?.workspaceId;
    if (!workspaceId) return { error: 'workspaceId required' };
    await this.svc.remove(workspaceId, id);
    return { success: true };
  }
}
