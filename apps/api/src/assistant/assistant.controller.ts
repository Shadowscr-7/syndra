// ============================================================
// Assistant Controller — /api/assistant
// ============================================================

import {
  Controller,
  Post,
  Delete,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AssistantService } from './assistant.service';
import { AuthGuard } from '../auth/auth.guard';
import type { ChatRequestDto } from './dto/chat.dto';

@Controller('assistant')
@UseGuards(AuthGuard)
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  /**
   * POST /api/assistant/chat
   * Send a message to the AI assistant
   */
  @Post('chat')
  @HttpCode(HttpStatus.OK)
  async chat(@Req() req: any, @Body() dto: ChatRequestDto) {
    const userId: string = req.user?.sub ?? '';
    const workspaceId: string = req.workspaceId ?? '';
    return this.assistantService.chat(userId, workspaceId, dto);
  }

  /**
   * DELETE /api/assistant/session
   * Clear conversation history for the current user session
   */
  @Delete('session')
  @HttpCode(HttpStatus.NO_CONTENT)
  clearSession(@Req() req: any, @Body() body: { sessionId?: string }) {
    const userId: string = req.user?.sub ?? '';
    this.assistantService.clearSession(userId, body.sessionId);
  }
}
