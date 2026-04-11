import { Controller, Get, Patch, Param, Body } from '@nestjs/common';
import { WorkspacesService } from './workspaces.service';
import { CurrentWorkspace } from '../auth/decorators';

@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Get()
  findAll() {
    return this.workspacesService.findAll();
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.workspacesService.findById(id);
  }

  @Patch('operation-mode')
  async updateOperationMode(
    @CurrentWorkspace() workspaceId: string,
    @Body() body: { mode: 'FULLY_AUTOMATIC' | 'APPROVAL_REQUIRED' | 'MANUAL' },
  ) {
    const ws = await this.workspacesService.updateOperationMode(workspaceId, body.mode);
    return { data: ws };
  }

  @Patch('video-preferences')
  async updateVideoPreferences(
    @CurrentWorkspace() workspaceId: string,
    @Body() body: { preferVideoFormat?: boolean; defaultAvatarId?: string; enableMusic?: boolean },
  ) {
    const ws = await this.workspacesService.updateVideoPreferences(workspaceId, body);
    return { data: ws };
  }
}
