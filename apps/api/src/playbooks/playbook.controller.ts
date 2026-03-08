import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentWorkspace } from '../auth/decorators';
import { ContentPlaybookService } from './playbook.service';

@Controller('playbooks')
@UseGuards(AuthGuard)
export class PlaybookController {
  constructor(private readonly service: ContentPlaybookService) {}

  @Get()
  list(@CurrentWorkspace() ws: { workspaceId: string }) {
    return this.service.list(ws.workspaceId);
  }

  @Get('public')
  listPublic() {
    return this.service.listPublic();
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Post()
  create(
    @CurrentWorkspace() ws: { workspaceId: string },
    @Body() body: any,
  ) {
    return this.service.create(ws.workspaceId, body);
  }

  @Post('from-campaign/:campaignId')
  saveFromCampaign(
    @CurrentWorkspace() ws: { workspaceId: string },
    @Param('campaignId') campaignId: string,
  ) {
    return this.service.saveFromCampaign(ws.workspaceId, campaignId);
  }

  @Post(':id/apply/:campaignId')
  apply(
    @Param('id') id: string,
    @Param('campaignId') campaignId: string,
  ) {
    return this.service.applyToCampaign(id, campaignId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
