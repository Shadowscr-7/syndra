import { Injectable, Logger } from '@nestjs/common';

export type TaskStatus = 'running' | 'completed' | 'failed';
export type TaskType = 'music' | 'image-pro' | 'video';

export interface BackgroundTask {
  id: string;
  type: TaskType;
  label: string;
  workspaceId: string;
  status: TaskStatus;
  result?: any;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

@Injectable()
export class BackgroundTasksService {
  private readonly logger = new Logger(BackgroundTasksService.name);
  private tasks = new Map<string, BackgroundTask>();

  createTask(opts: {
    type: TaskType;
    label: string;
    workspaceId: string;
  }): string {
    const id = `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.tasks.set(id, {
      id,
      type: opts.type,
      label: opts.label,
      workspaceId: opts.workspaceId,
      status: 'running',
      createdAt: new Date(),
    });
    this.logger.log(`Task ${id} created: ${opts.label}`);
    return id;
  }

  completeTask(id: string, result: any) {
    const task = this.tasks.get(id);
    if (task) {
      task.status = 'completed';
      task.result = result;
      task.completedAt = new Date();
      this.logger.log(`Task ${id} completed`);
      // Auto-cleanup after 30 minutes
      setTimeout(() => this.tasks.delete(id), 30 * 60 * 1000);
    }
  }

  failTask(id: string, error: string) {
    const task = this.tasks.get(id);
    if (task) {
      task.status = 'failed';
      task.error = error;
      task.completedAt = new Date();
      this.logger.warn(`Task ${id} failed: ${error}`);
      setTimeout(() => this.tasks.delete(id), 30 * 60 * 1000);
    }
  }

  getTask(id: string): BackgroundTask | undefined {
    return this.tasks.get(id);
  }

  getTasksByWorkspace(workspaceId: string): BackgroundTask[] {
    return Array.from(this.tasks.values())
      .filter((t) => t.workspaceId === workspaceId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}
