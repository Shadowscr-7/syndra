'use client';

import { createContext, useContext, useCallback, useState, useRef, useEffect } from 'react';
import { useToast } from './toast-context';

export type TaskStatus = 'running' | 'completed' | 'failed';
export type TaskType = 'music' | 'image-pro' | 'video';

export interface BackgroundTask {
  id: string;
  type: TaskType;
  label: string;
  status: TaskStatus;
  result?: any;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

interface BackgroundTasksContextType {
  tasks: BackgroundTask[];
  runningCount: number;
  addTask: (taskId: string, type: TaskType, label: string) => void;
  dismissTask: (taskId: string) => void;
  showPanel: boolean;
  setShowPanel: (v: boolean) => void;
}

const BackgroundTasksContext = createContext<BackgroundTasksContextType>({
  tasks: [],
  runningCount: 0,
  addTask: () => {},
  dismissTask: () => {},
  showPanel: false,
  setShowPanel: () => {},
});

export function useBackgroundTasks() {
  return useContext(BackgroundTasksContext);
}

export function BackgroundTasksProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<BackgroundTask[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const pollingRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const { showToast } = useToast();

  const runningCount = tasks.filter((t) => t.status === 'running').length;

  const updateTask = useCallback((taskId: string, updates: Partial<BackgroundTask>) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t)));
  }, []);

  const pollTask = useCallback(
    (taskId: string) => {
      const interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/weekly-planner/tasks/${encodeURIComponent(taskId)}`);
          if (!res.ok) return;
          const { data } = await res.json();
          if (!data) return;

          if (data.status === 'completed') {
            clearInterval(interval);
            pollingRef.current.delete(taskId);
            updateTask(taskId, {
              status: 'completed',
              result: data.result,
              completedAt: data.completedAt,
            });
            showToast({
              type: 'success',
              message: `${data.label ?? 'Proceso'} completado`,
              detail: data.type === 'music' ? '🎵 Música lista' : '✅ Listo',
              duration: 8000,
            });
          } else if (data.status === 'failed') {
            clearInterval(interval);
            pollingRef.current.delete(taskId);
            updateTask(taskId, {
              status: 'failed',
              error: data.error,
              completedAt: data.completedAt,
            });
            showToast({
              type: 'error',
              message: `${data.label ?? 'Proceso'} falló`,
              detail: data.error ?? 'Error desconocido',
              duration: 8000,
            });
          }
        } catch {
          // transient error, keep polling
        }
      }, 3000);

      pollingRef.current.set(taskId, interval);
    },
    [updateTask, showToast],
  );

  const addTask = useCallback(
    (taskId: string, type: TaskType, label: string) => {
      const newTask: BackgroundTask = {
        id: taskId,
        type,
        label,
        status: 'running',
        createdAt: new Date().toISOString(),
      };
      setTasks((prev) => [newTask, ...prev]);
      pollTask(taskId);
    },
    [pollTask],
  );

  const dismissTask = useCallback((taskId: string) => {
    const interval = pollingRef.current.get(taskId);
    if (interval) {
      clearInterval(interval);
      pollingRef.current.delete(taskId);
    }
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      pollingRef.current.forEach((interval) => clearInterval(interval));
      pollingRef.current.clear();
    };
  }, []);

  return (
    <BackgroundTasksContext.Provider
      value={{ tasks, runningCount, addTask, dismissTask, showPanel, setShowPanel }}
    >
      {children}
    </BackgroundTasksContext.Provider>
  );
}
