# PENDIENTE: Migrar sistema de colas a BullMQ + Redis

## Contexto

El sistema de colas actual usa **pgmq** (extensión de Supabase). Como la infra usa PostgreSQL estándar en Docker (sin Supabase), pgmq no está disponible. El código cae a un fallback **in-memory** que pierde los jobs si el contenedor se reinicia.

**Solución elegida: BullMQ + Redis**

---

## Qué hay que hacer

### 1. Agregar Redis al docker-compose.yml

```yaml
redis:
  image: redis:7-alpine
  restart: unless-stopped
  ports:
    - "6379:6379"
  volumes:
    - redis_data:/data

volumes:
  redis_data:
```

### 2. Instalar dependencias

```bash
npm install bullmq @nestjs/bullmq --workspace=apps/api
```

### 3. Registrar BullMQ en app.module.ts

```typescript
import { BullModule } from '@nestjs/bullmq';

BullModule.forRoot({
  connection: {
    host: process.env.REDIS_HOST || 'redis',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
}),

BullModule.registerQueue(
  { name: 'editorial_jobs' },
  { name: 'publish_jobs' },
  { name: 'media_jobs' },
  { name: 'video_jobs' },
  { name: 'analytics_jobs' },
),
```

### 4. Reemplazar QueueService

Archivo actual: `apps/api/src/queue/queue.service.ts`

Reemplazar la lógica de pgmq + devQueue por llamadas a BullMQ:
- `enqueue(queue, payload)` → `this.queue.add(jobName, payload)`
- `dequeue(queue)` → manejado por `@Processor()` decorators
- `acknowledge(queue, id)` → automático en BullMQ

### 5. Convertir workers a @Processor de BullMQ

Archivos a modificar:
- `apps/api/src/editorial/editorial-worker.service.ts`
- `apps/api/src/publisher/publisher-worker.service.ts`
- `apps/api/src/video/video-worker.service.ts`

Patrón:

```typescript
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

@Processor('editorial_jobs')
export class EditorialWorkerService extends WorkerHost {
  async process(job: Job): Promise<void> {
    // lógica actual del worker
  }
}
```

### 6. Agregar variables de entorno

En `.env` y `.env.example`:

```
REDIS_HOST=redis
REDIS_PORT=6379
```

### 7. Agregar Bull Board (UI de monitoreo, opcional pero recomendado)

```bash
npm install @bull-board/nestjs @bull-board/api @bull-board/express --workspace=apps/api
```

Montar en `/admin/queues` protegido con rol ADMIN.

---

## Ventajas sobre el sistema actual

| Feature | In-memory (actual) | BullMQ + Redis |
|---|---|---|
| Persistencia | ❌ Se pierde al reiniciar | ✅ Persistente |
| Reintentos | Manual | ✅ Automático con backoff |
| Monitoreo | Logs solamente | ✅ UI visual |
| Concurrencia | Limitada | ✅ Configurable |
| Cron jobs | Separado | ✅ Integrado (BullMQ Scheduler) |

---

## Prioridad

**Media** — El sistema actual funciona en producción. Migrar cuando haya una ventana de mantenimiento o cuando el volumen de jobs justifique mayor robustez.
