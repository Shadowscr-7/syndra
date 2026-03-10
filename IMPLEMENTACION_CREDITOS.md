# IMPLEMENTACIÓN COMPLETA — Sistema de Créditos IA + Proveedores

> **Scope:** Implementar sistema de créditos IA, adaptadores Replicate/fal.ai, selección inteligente de modelos,
> compra de créditos via Stripe, y UI completa. Todo en orden de dependencia.
>
> **Referencia:** Ver `MEJORAS_4.md` para investigación de proveedores y costos.

---

## 💡 CÓMO FUNCIONA EL FLUJO DE DINERO (Importante)

```
Usuario compra 100 créditos ($5) via Stripe
        │
        ▼
Stripe cobra $5 a la tarjeta del usuario
        │
        ▼
Stripe deposita $5 (menos comisión ~3%) en TU cuenta Stripe → $4.85
        │
        ▼
Syndra acredita 100 créditos internos en la DB del usuario
        │
        ▼
Usuario genera 1 imagen con Ideogram → Syndra descuenta 5 créditos internos
        │
        ▼
Syndra llama API Replicate → Replicate cobra $0.09 a TU tarjeta de crédito
```

### ¿Necesito comprar créditos en Replicate/fal.ai cuando un usuario compra créditos?

**NO.** Los proveedores de IA son **pay-as-you-go** (pago por uso):

| Proveedor | Modelo de cobro | Cómo configurar |
|-----------|----------------|-----------------|
| **Replicate** | Tarjeta de crédito → factura mensual por uso | 1. Crear cuenta → 2. Agregar tarjeta → 3. Copiar `REPLICATE_API_TOKEN` |
| **fal.ai** | Tarjeta de crédito → factura mensual por uso | 1. Crear cuenta → 2. Agregar tarjeta → 3. Copiar `FAL_KEY` |
| **OpenAI (DALL-E)** | Tarjeta + billing limit → factura mensual | Ya configurado con `LLM_API_KEY` |
| **HeyGen** | Suscripción mensual fija ($59/mo) | Ya configurado con `HEYGEN_API_KEY` |
| **ElevenLabs** | Suscripción mensual fija ($5+/mo) | Ya configurado con `ELEVENLABS_API_KEY` |

**TU margen es la diferencia:**
- Usuario paga $5 por 100 créditos (= $0.05/crédito)
- Imagen Flux vía Replicate te cuesta $0.003 (1 crédito = ganancia $0.047)
- Imagen Ideogram te cuesta $0.09 (5 créditos = $0.25 cobrado, ganancia $0.16)
- Video 5s te cuesta ~$0.25 (10 créditos = $0.50 cobrado, ganancia $0.25)

**Protección:** Configura billing limits en cada proveedor:
- Replicate: Settings → Billing → Set monthly spend limit ($100/mo para empezar)
- fal.ai: Dashboard → Billing → Set limit
- Esto evita que un bug genere cargos infinitos

---

## 📐 ARQUITECTURA DEL SISTEMA DE CRÉDITOS

```
                    ┌──────────────────────────────────────┐
                    │         Stripe Checkout               │
                    │  (compra de paquetes de créditos)     │
                    └──────────┬───────────────────────────┘
                               │ webhook: payment_intent.succeeded
                    ┌──────────▼───────────────────────────┐
                    │     CreditService                     │
                    │  ┌─────────────────────────────┐     │
                    │  │ addCredits(wId, amount, src) │     │
                    │  │ consumeCredits(wId, amount)  │     │
                    │  │ getBalance(wId) → number     │     │
                    │  │ hasEnough(wId, cost) → bool  │     │
                    │  │ getHistory(wId) → AICredit[] │     │
                    │  └─────────────────────────────┘     │
                    └──────────┬───────────────────────────┘
                               │
                    ┌──────────▼───────────────────────────┐
                    │       CreditGuard (NestJS Guard)      │
                    │                                       │
                    │  @UseCredits(cost: number)             │
                    │  - Starter: reject (solo gratis)       │
                    │  - Creator: check balance ≥ cost       │
                    │  - Pro: always pass (unlimited)        │
                    │  - Post-execution: deduct credits      │
                    └──────────┬───────────────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
   ┌──────▼──────┐    ┌───────▼──────┐    ┌───────▼──────┐
   │  ImageGen   │    │  VideoGen    │    │  AvatarGen   │
   │  (Replicate │    │  (Replicate  │    │  (D-ID /     │
   │   / fal.ai) │    │   Wan/fal.ai │    │   Hedra)     │
   └─────────────┘    │   Wan)       │    └──────────────┘
                      └──────────────┘
```

---

## 📋 ORDEN DE IMPLEMENTACIÓN (secuencial, con dependencias)

| # | Tarea | Depende de | Archivos |
|---|-------|-----------|----------|
| **1** | Schema Prisma: modelo AICredit + enums | — | `schema.prisma` |
| **2** | CreditService | #1 | `credits.service.ts` |
| **3** | CreditGuard + decoradores | #2 | `credit.guard.ts` |
| **4** | CreditController (API endpoints) | #2 | `credits.controller.ts`, `credits.module.ts` |
| **5** | Adaptador Replicate (imágenes) | — | `replicate.ts` |
| **6** | Integrar Replicate en factory | #5 | `media-engine.service.ts` |
| **7** | Selección inteligente de modelo | #3, #6 | `media-engine.service.ts` |
| **8** | Adaptador Replicate Video (Wan 2.1) | #5 | `replicate-video.ts` |
| **9** | Adaptador fal.ai Video (Wan 2.5) | — | `fal-video.ts` |
| **10** | Integrar video en VideoTierRouter | #8, #9, #3 | `video-tier-router.service.ts` |
| **11** | Composite Video real (ffmpeg) | — | `composite-video.ts` |
| **12** | Adaptador D-ID (avatar barato) | — | `did-video.ts` |
| **13** | Adaptador Hedra (avatar ultra-barato) | — | `hedra-video.ts` |
| **14** | Avatar persistente | #12, #13 | `schema.prisma`, `avatar.service.ts` |
| **15** | Stripe Checkout para créditos | #2 | `stripe.service.ts`, `credits.controller.ts` |
| **16** | Webhook Stripe | #15 | `stripe-webhook.controller.ts` |
| **17** | UI: página /dashboard/credits | #4 | `page.tsx`, components |
| **18** | UI: widget créditos sidebar | #4 | `sidebar.tsx`, `credit-widget.tsx` |
| **19** | UI: confirmación consumo | #4 | `credit-confirm-dialog.tsx` |
| **20** | Alertas bajo saldo | #2 | `credit-alerts.service.ts` |

---

## PASO 1 — Schema Prisma

### Archivo: `packages/db/prisma/schema.prisma`

#### 1.1 Nuevo modelo `AICredit` (complementa `VideoCredit` existente)

```prisma
// ──────────────── AI Credits ────────────────

enum CreditSource {
  PLAN       // Créditos gratis del plan (100 para Creator)
  PURCHASE   // Comprado via Stripe
  ADDON      // Complemento del plan
  PROMO      // Código promocional
  REFUND     // Devolución por error de generación
}

enum CreditOperationType {
  IMAGE_STANDARD      // 1 crédito  — Replicate Flux-schnell
  IMAGE_TEXT           // 5 créditos — Ideogram/Recraft
  IMAGE_HD             // 3 créditos — Flux-dev
  ANIMATION_5S         // 10 créditos — Wan i2v 5s
  ANIMATION_10S        // 15 créditos
  VIDEO_REEL_10S       // 20 créditos — Wan t2v
  VIDEO_REEL_15S       // 25 créditos
  AVATAR_BASIC_30S     // 30 créditos — D-ID/Hedra
  AVATAR_PREMIUM_30S   // 50 créditos — HeyGen
  VOICE_PREMIUM        // 2 créditos  — ElevenLabs
}

model AICredit {
  id           String       @id @default(cuid())
  workspaceId  String       @map("workspace_id")
  amount       Int          // positivo = recarga, negativo = consumo
  balance      Int          // balance después de esta operación
  source       CreditSource 
  operation    CreditOperationType? // null para recargas
  description  String?      // "Compra paquete Popular", "Imagen Ideogram: vestido rojo..."
  referenceId  String?      @map("reference_id") // ID del MediaAsset o VideoRenderJob
  stripePaymentId String?   @map("stripe_payment_id")
  createdAt    DateTime     @default(now()) @map("created_at")

  workspace    Workspace    @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  @@index([workspaceId, createdAt])
  @@index([workspaceId, source])
  @@map("ai_credits")
}

model CreditBalance {
  id               String   @id @default(cuid())
  workspaceId      String   @unique @map("workspace_id")
  totalPurchased   Int      @default(0) @map("total_purchased")
  totalConsumed    Int      @default(0) @map("total_consumed")
  totalRefunded    Int      @default(0) @map("total_refunded")
  currentBalance   Int      @default(0) @map("current_balance")
  isUnlimited      Boolean  @default(false) @map("is_unlimited") // Pro plan
  updatedAt        DateTime @updatedAt @map("updated_at")

  workspace        Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  @@map("credit_balances")
}
```

#### 1.2 Agregar relaciones en Workspace

```prisma
// En el modelo Workspace existente, agregar:
  aiCredits      AICredit[]
  creditBalance  CreditBalance?
```

#### 1.3 Nuevos VideoProvider values

```prisma
enum VideoProvider {
  HEYGEN
  PIKA
  LUMA
  SVD_LOCAL
  WAN_LOCAL
  HUNYUAN_LOCAL
  EDGE_TTS_COMPOSE
  REPLICATE_WAN     // NUEVO — Wan 2.1 via Replicate
  FAL_WAN           // NUEVO — Wan 2.5 via fal.ai
  LUMA_RAY          // NUEVO — Luma Ray 2 real API
  DID               // NUEVO — D-ID avatar
  HEDRA             // NUEVO — Hedra avatar
  MOCK
}
```

#### 1.4 Nuevo CredentialProvider values

```prisma
enum UserCredentialProvider {
  LLM
  IMAGE_GEN
  RESEARCH
  META
  DISCORD
  CLOUDINARY
  GOOGLE_DRIVE
  AWS_S3
  HEYGEN
  TELEGRAM
  REPLICATE       // NUEVO
  FAL_AI          // NUEVO
  DID             // NUEVO
  HEDRA           // NUEVO
  STRIPE          // NUEVO (para webhook secret)
}
```

#### 1.5 Modelo AvatarProfile (Fase 4)

```prisma
model AvatarProfile {
  id           String   @id @default(cuid())
  workspaceId  String   @map("workspace_id")
  name         String   // "Avatar de Juan"
  photoUrl     String   @map("photo_url")  // foto original subida
  provider     String   // 'heygen' | 'did' | 'hedra'
  externalId   String?  @map("external_id") // ID del avatar en el servicio externo
  voiceId      String?  @map("voice_id")   // voz asignada
  isDefault    Boolean  @default(false) @map("is_default")
  metadata     Json?
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  workspace    Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  @@index([workspaceId])
  @@map("avatar_profiles")
}
```

### Migración:

```bash
cd packages/db
npx prisma migrate dev --name add_ai_credits_system
```

---

## PASO 2 — CreditService

### Archivo: `apps/api/src/credits/credits.service.ts` (NUEVO)

```typescript
import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreditSource, CreditOperationType, Prisma } from '@prisma/client';

// Tabla de costos por operación
export const CREDIT_COSTS: Record<CreditOperationType, number> = {
  IMAGE_STANDARD: 1,
  IMAGE_TEXT: 5,
  IMAGE_HD: 3,
  ANIMATION_5S: 10,
  ANIMATION_10S: 15,
  VIDEO_REEL_10S: 20,
  VIDEO_REEL_15S: 25,
  AVATAR_BASIC_30S: 30,
  AVATAR_PREMIUM_30S: 50,
  VOICE_PREMIUM: 2,
};

// Paquetes de compra
export const CREDIT_PACKAGES = {
  basic:   { credits: 100,  priceUsd: 500,  label: 'Básico (100 créditos)',  stripePriceId: '' },
  popular: { credits: 350,  priceUsd: 1500, label: 'Popular (350 créditos)', stripePriceId: '' },
  mega:    { credits: 1000, priceUsd: 3500, label: 'Mega (1000 créditos)',   stripePriceId: '' },
} as const;

export type CreditPackageKey = keyof typeof CREDIT_PACKAGES;

@Injectable()
export class CreditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtener balance actual del workspace
   */
  async getBalance(workspaceId: string): Promise<{
    currentBalance: number;
    totalPurchased: number;
    totalConsumed: number;
    isUnlimited: boolean;
  }> {
    let balance = await this.prisma.creditBalance.findUnique({
      where: { workspaceId },
    });

    if (!balance) {
      // Crear balance inicial si no existe
      balance = await this.prisma.creditBalance.create({
        data: { workspaceId, currentBalance: 0, isUnlimited: false },
      });
    }

    return {
      currentBalance: balance.currentBalance,
      totalPurchased: balance.totalPurchased,
      totalConsumed: balance.totalConsumed,
      isUnlimited: balance.isUnlimited,
    };
  }

  /**
   * Verificar si tiene suficientes créditos para una operación
   */
  async hasEnoughCredits(workspaceId: string, operation: CreditOperationType): Promise<boolean> {
    const balance = await this.getBalance(workspaceId);
    if (balance.isUnlimited) return true;
    return balance.currentBalance >= CREDIT_COSTS[operation];
  }

  /**
   * Consumir créditos (llamar DESPUÉS de generar exitosamente)
   * Usa transacción para atomicidad
   */
  async consumeCredits(
    workspaceId: string,
    operation: CreditOperationType,
    description?: string,
    referenceId?: string,
  ): Promise<{ newBalance: number; creditsUsed: number }> {
    const cost = CREDIT_COSTS[operation];

    return this.prisma.$transaction(async (tx) => {
      const balance = await tx.creditBalance.findUnique({
        where: { workspaceId },
      });

      if (!balance) {
        throw new BadRequestException('No credit balance found for workspace');
      }

      if (balance.isUnlimited) {
        // Pro: registrar consumo pero no decrementar
        await tx.aICredit.create({
          data: {
            workspaceId,
            amount: -cost,
            balance: balance.currentBalance, // no cambia
            source: CreditSource.PLAN,
            operation,
            description: description ?? `${operation} (unlimited plan)`,
            referenceId,
          },
        });
        return { newBalance: balance.currentBalance, creditsUsed: cost };
      }

      if (balance.currentBalance < cost) {
        throw new ForbiddenException(
          `Créditos insuficientes. Necesitas ${cost} créditos, tienes ${balance.currentBalance}`,
        );
      }

      const newBalance = balance.currentBalance - cost;

      // Actualizar balance + crear registro de auditoría en transacción
      await tx.creditBalance.update({
        where: { workspaceId },
        data: {
          currentBalance: { decrement: cost },
          totalConsumed: { increment: cost },
        },
      });

      await tx.aICredit.create({
        data: {
          workspaceId,
          amount: -cost,
          balance: newBalance,
          source: CreditSource.PLAN, // consumed from whatever source
          operation,
          description,
          referenceId,
        },
      });

      return { newBalance, creditsUsed: cost };
    });
  }

  /**
   * Agregar créditos (compra, plan, promoción, refund)
   */
  async addCredits(
    workspaceId: string,
    amount: number,
    source: CreditSource,
    description?: string,
    stripePaymentId?: string,
  ): Promise<{ newBalance: number }> {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');

    return this.prisma.$transaction(async (tx) => {
      // Upsert balance
      const balance = await tx.creditBalance.upsert({
        where: { workspaceId },
        create: {
          workspaceId,
          currentBalance: amount,
          totalPurchased: amount,
        },
        update: {
          currentBalance: { increment: amount },
          totalPurchased: { increment: amount },
        },
      });

      // Registro de auditoría
      await tx.aICredit.create({
        data: {
          workspaceId,
          amount,
          balance: balance.currentBalance,
          source,
          description,
          stripePaymentId,
        },
      });

      return { newBalance: balance.currentBalance };
    });
  }

  /**
   * Refund de créditos por error de generación
   */
  async refundCredits(
    workspaceId: string,
    amount: number,
    referenceId: string,
    reason: string,
  ): Promise<{ newBalance: number }> {
    return this.prisma.$transaction(async (tx) => {
      const balance = await tx.creditBalance.update({
        where: { workspaceId },
        data: {
          currentBalance: { increment: amount },
          totalRefunded: { increment: amount },
        },
      });

      await tx.aICredit.create({
        data: {
          workspaceId,
          amount,
          balance: balance.currentBalance,
          source: CreditSource.REFUND,
          description: `Refund: ${reason}`,
          referenceId,
        },
      });

      return { newBalance: balance.currentBalance };
    });
  }

  /**
   * Marcar workspace como ilimitado (upgrade a Pro)
   */
  async setUnlimited(workspaceId: string, unlimited: boolean): Promise<void> {
    await this.prisma.creditBalance.upsert({
      where: { workspaceId },
      create: { workspaceId, isUnlimited: unlimited },
      update: { isUnlimited: unlimited },
    });
  }

  /**
   * Asignar créditos gratis de plan (onboarding Creator)
   */
  async assignPlanCredits(workspaceId: string, planSlug: string): Promise<void> {
    const FREE_CREDITS: Record<string, number> = {
      starter: 0,
      creator: 100,
      pro: 0, // Pro es unlimited, no necesita créditos numéricos
    };

    const credits = FREE_CREDITS[planSlug] ?? 0;

    if (planSlug === 'pro') {
      await this.setUnlimited(workspaceId, true);
    } else {
      await this.setUnlimited(workspaceId, false);
    }

    if (credits > 0) {
      await this.addCredits(
        workspaceId,
        credits,
        CreditSource.PLAN,
        `${credits} créditos gratis del plan ${planSlug}`,
      );
    }
  }

  /**
   * Historial de transacciones de créditos
   */
  async getHistory(
    workspaceId: string,
    opts?: { limit?: number; offset?: number; source?: CreditSource },
  ) {
    return this.prisma.aICredit.findMany({
      where: {
        workspaceId,
        ...(opts?.source && { source: opts.source }),
      },
      orderBy: { createdAt: 'desc' },
      take: opts?.limit ?? 50,
      skip: opts?.offset ?? 0,
    });
  }
}
```

---

## PASO 3 — CreditGuard + Decoradores

### Archivo: `apps/api/src/credits/credit.guard.ts` (NUEVO)

```typescript
import { Injectable, CanActivate, ExecutionContext, SetMetadata, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CreditOperationType } from '@prisma/client';
import { CreditService, CREDIT_COSTS } from './credits.service';
import { PlansService } from '../plans/plans.service';

export const CREDIT_COST_KEY = 'credit_cost';

/**
 * Decorador para marcar un endpoint que consume créditos
 * @example @UseCredits(CreditOperationType.IMAGE_TEXT)
 */
export const UseCredits = (operation: CreditOperationType) =>
  SetMetadata(CREDIT_COST_KEY, operation);

@Injectable()
export class CreditGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly creditService: CreditService,
    private readonly plansService: PlansService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const operation = this.reflector.getAllAndOverride<CreditOperationType>(
      CREDIT_COST_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Si no tiene decorador @UseCredits, dejar pasar
    if (!operation) return true;

    const request = context.switchToHttp().getRequest();
    const workspaceId = request.headers['x-workspace-id'] 
      ?? request.user?.workspaceId
      ?? request.params?.workspaceId;

    if (!workspaceId) {
      throw new ForbiddenException('Workspace ID required for credit operations');
    }

    const cost = CREDIT_COSTS[operation];

    // Obtener plan del workspace
    const workspace = await this.plansService['prisma'].workspace.findUnique({
      where: { id: workspaceId },
      select: { plan: { select: { slug: true } } },
    });

    const planSlug = workspace?.plan?.slug ?? 'starter';

    // Starter: solo operaciones gratis (sin decorador @UseCredits)
    if (planSlug === 'starter') {
      throw new ForbiddenException({
        code: 'CREDITS_PLAN_REQUIRED',
        message: 'Tu plan Starter solo incluye generación gratuita. Upgrade a Creator para usar créditos IA.',
        requiredPlan: 'creator',
        cost,
      });
    }

    // Pro: ilimitado, siempre pasar
    if (planSlug === 'pro') {
      // Guardar operation en request para post-processing (logging)
      request._creditOperation = operation;
      request._creditCost = cost;
      return true;
    }

    // Creator: verificar balance
    const hasEnough = await this.creditService.hasEnoughCredits(workspaceId, operation);
    if (!hasEnough) {
      const balance = await this.creditService.getBalance(workspaceId);
      throw new ForbiddenException({
        code: 'CREDITS_INSUFFICIENT',
        message: `Créditos insuficientes. Necesitas ${cost}, tienes ${balance.currentBalance}.`,
        cost,
        currentBalance: balance.currentBalance,
        purchaseUrl: '/dashboard/credits',
      });
    }

    // Guardar para post-processing
    request._creditOperation = operation;
    request._creditCost = cost;
    return true;
  }
}
```

### Archivo: `apps/api/src/credits/credit.interceptor.ts` (NUEVO)

```typescript
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, tap, catchError } from 'rxjs';
import { CreditService } from './credits.service';

/**
 * Interceptor que consume créditos DESPUÉS de una generación exitosa
 * y hace refund si falla.
 */
@Injectable()
export class CreditInterceptor implements NestInterceptor {
  constructor(private readonly creditService: CreditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const operation = request._creditOperation;
    const workspaceId = request.headers['x-workspace-id']
      ?? request.user?.workspaceId;

    if (!operation || !workspaceId) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(async (result) => {
        // Éxito → consumir créditos
        try {
          const referenceId = result?.id ?? result?.jobId ?? result?.assetId;
          await this.creditService.consumeCredits(
            workspaceId,
            operation,
            `${operation}: ${result?.prompt?.slice(0, 80) ?? 'generation'}`,
            referenceId,
          );
        } catch (err) {
          // Log pero no fallar la respuesta (ya se generó el contenido)
          console.error('[CreditInterceptor] Failed to deduct credits:', err);
        }
      }),
      catchError(async (error) => {
        // Si la generación falló, NO consumir créditos (ya verificamos en guard)
        throw error;
      }),
    );
  }
}
```

---

## PASO 4 — CreditController + Module

### Archivo: `apps/api/src/credits/credits.controller.ts` (NUEVO)

```typescript
import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CreditService, CREDIT_COSTS, CREDIT_PACKAGES, CreditPackageKey } from './credits.service';
import { CreditSource } from '@prisma/client';

@Controller('credits')
@UseGuards(AuthGuard)
export class CreditController {
  constructor(private readonly creditService: CreditService) {}

  /**
   * GET /credits/balance
   * Obtener balance actual del workspace
   */
  @Get('balance')
  async getBalance(@Req() req: any) {
    const workspaceId = req.headers['x-workspace-id'];
    return this.creditService.getBalance(workspaceId);
  }

  /**
   * GET /credits/costs
   * Tabla de costos (para mostrar en UI)
   */
  @Get('costs')
  getCosts() {
    return {
      operations: CREDIT_COSTS,
      packages: CREDIT_PACKAGES,
    };
  }

  /**
   * GET /credits/history?limit=50&offset=0
   * Historial de transacciones
   */
  @Get('history')
  async getHistory(
    @Req() req: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('source') source?: CreditSource,
  ) {
    const workspaceId = req.headers['x-workspace-id'];
    return this.creditService.getHistory(workspaceId, {
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
      source,
    });
  }

  /**
   * POST /credits/purchase
   * Iniciar compra de créditos via Stripe
   * Body: { package: 'basic' | 'popular' | 'mega' }
   */
  @Post('purchase')
  async purchase(
    @Req() req: any,
    @Body() body: { package: CreditPackageKey },
  ) {
    const workspaceId = req.headers['x-workspace-id'];
    const pkg = CREDIT_PACKAGES[body.package];
    if (!pkg) throw new Error('Invalid package');

    // TODO: Integrar Stripe Checkout session
    // const session = await stripeService.createCheckoutSession({
    //   workspaceId,
    //   priceId: pkg.stripePriceId,
    //   metadata: { package: body.package, credits: pkg.credits },
    // });
    // return { checkoutUrl: session.url };

    // TEMPORAL: Acreditar directamente (para dev/testing)
    const result = await this.creditService.addCredits(
      workspaceId,
      pkg.credits,
      CreditSource.PURCHASE,
      `Compra: ${pkg.label}`,
    );
    return result;
  }
}
```

### Archivo: `apps/api/src/credits/credits.module.ts` (NUEVO)

```typescript
import { Module } from '@nestjs/common';
import { CreditService } from './credits.service';
import { CreditController } from './credits.controller';
import { CreditGuard } from './credit.guard';
import { CreditInterceptor } from './credit.interceptor';
import { PrismaModule } from '../prisma/prisma.module';
import { PlansModule } from '../plans/plans.module'; // si PlansService está en su módulo

@Module({
  imports: [PrismaModule, PlansModule],
  controllers: [CreditController],
  providers: [CreditService, CreditGuard, CreditInterceptor],
  exports: [CreditService, CreditGuard, CreditInterceptor],
})
export class CreditsModule {}
```

### Registrar en AppModule:

```typescript
// apps/api/src/app.module.ts — agregar:
import { CreditsModule } from './credits/credits.module';

@Module({
  imports: [
    // ... existentes ...
    CreditsModule,
  ],
})
```

---

## PASO 5 — Adaptador Replicate (Imágenes multi-modelo)

### Archivo: `packages/media/src/adapters/replicate.ts` (NUEVO)

```typescript
import type { ImageGeneratorAdapter, ImageGenOptions, GeneratedImage } from '../index';

export interface ReplicateConfig {
  apiToken: string;
  defaultModel?: ReplicateImageModel;
  maxPollAttempts?: number;
  pollIntervalMs?: number;
}

export type ReplicateImageModel =
  | 'flux-schnell'      // $0.003/img — rápido, buena calidad general
  | 'flux-dev'          // $0.025/img — mejor calidad, más lento
  | 'ideogram-v3'       // $0.09/img  — MEJOR para texto en imágenes
  | 'recraft-v3'        // $0.04/img  — muy bueno en diseño gráfico + texto
  | 'sdxl';             // $0.01/img  — Stable Diffusion XL

// Mapeo modelo → modelo completo de Replicate
const MODEL_VERSIONS: Record<ReplicateImageModel, string> = {
  'flux-schnell': 'black-forest-labs/flux-schnell',
  'flux-dev': 'black-forest-labs/flux-dev',
  'ideogram-v3': 'ideogram-ai/ideogram-v3',
  'recraft-v3': 'recraft-ai/recraft-v3',
  'sdxl': 'stability-ai/sdxl:7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc',
};

export class ReplicateImageAdapter implements ImageGeneratorAdapter {
  private readonly apiToken: string;
  private readonly defaultModel: ReplicateImageModel;
  private readonly maxPoll: number;
  private readonly pollInterval: number;
  private readonly baseUrl = 'https://api.replicate.com/v1';

  constructor(config: ReplicateConfig) {
    if (!config.apiToken) throw new Error('ReplicateImageAdapter requires apiToken');
    this.apiToken = config.apiToken;
    this.defaultModel = config.defaultModel ?? 'flux-schnell';
    this.maxPoll = config.maxPollAttempts ?? 60;
    this.pollInterval = config.pollIntervalMs ?? 2000;
  }

  async generate(prompt: string, options?: ImageGenOptions & { model?: ReplicateImageModel }): Promise<GeneratedImage> {
    const model = options?.model ?? this.defaultModel;
    const modelId = MODEL_VERSIONS[model];
    if (!modelId) throw new Error(`Unknown Replicate model: ${model}`);

    // Construir input según el modelo
    const input = this.buildInput(model, prompt, options);

    // 1. Crear predicción
    const createUrl = modelId.includes(':')
      ? `${this.baseUrl}/predictions`
      : `${this.baseUrl}/models/${modelId}/predictions`;

    const createBody: any = { input };
    if (modelId.includes(':')) {
      createBody.version = modelId.split(':')[1];
    }

    const createRes = await fetch(createUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait', // Para modelos rápidos, Replicate responde directamente
      },
      body: JSON.stringify(createBody),
    });

    if (!createRes.ok) {
      const err = await createRes.text();
      throw new Error(`Replicate create failed (${createRes.status}): ${err}`);
    }

    let prediction = await createRes.json() as any;

    // 2. Si el header "Prefer: wait" no resolvió, poll
    if (prediction.status !== 'succeeded' && prediction.status !== 'failed') {
      prediction = await this.pollPrediction(prediction.id);
    }

    if (prediction.status === 'failed') {
      throw new Error(`Replicate prediction failed: ${prediction.error ?? 'Unknown error'}`);
    }

    // 3. Extraer URL de output
    const outputUrl = Array.isArray(prediction.output)
      ? prediction.output[0]
      : prediction.output;

    if (!outputUrl) throw new Error('Replicate returned no output');

    return {
      url: outputUrl,
      prompt,
      provider: `replicate/${model}`,
      metadata: {
        model,
        predictionId: prediction.id,
        metrics: prediction.metrics, // { predict_time, total_time }
        width: options?.width,
        height: options?.height,
      },
    };
  }

  private buildInput(model: ReplicateImageModel, prompt: string, options?: ImageGenOptions): Record<string, any> {
    const base: Record<string, any> = { prompt };

    switch (model) {
      case 'flux-schnell':
      case 'flux-dev':
        return {
          ...base,
          num_outputs: 1,
          aspect_ratio: this.getAspectRatio(options),
          output_format: 'webp',
          output_quality: options?.quality === 'hd' ? 95 : 80,
        };

      case 'ideogram-v3':
        return {
          ...base,
          rendering_speed: 'DEFAULT',         // DEFAULT | QUALITY | TURBO
          aspect_ratio: this.getAspectRatioIdeogram(options),
          style: options?.style ?? 'AUTO',     // AUTO, GENERAL, REALISTIC, DESIGN
          magic_prompt: true,                  // Ideogram mejora el prompt automáticamente
        };

      case 'recraft-v3':
        return {
          ...base,
          size: this.getSizeRecraft(options),
          style: options?.style ?? 'any',      // any, realistic_image, digital_illustration, etc.
        };

      case 'sdxl':
        return {
          ...base,
          width: options?.width ?? 1024,
          height: options?.height ?? 1024,
          num_outputs: 1,
          scheduler: 'K_EULER',
          num_inference_steps: 25,
        };

      default:
        return base;
    }
  }

  private getAspectRatio(options?: ImageGenOptions): string {
    if (!options?.width || !options?.height) return '1:1';
    const ratio = options.width / options.height;
    if (ratio > 1.5) return '16:9';
    if (ratio > 1.2) return '3:2';
    if (ratio < 0.7) return '9:16';
    if (ratio < 0.85) return '2:3';
    return '1:1';
  }

  private getAspectRatioIdeogram(options?: ImageGenOptions): string {
    // Ideogram usa: ASPECT_1_1, ASPECT_16_9, ASPECT_9_16, ASPECT_4_3, etc.
    if (!options?.width || !options?.height) return 'ASPECT_1_1';
    const ratio = options.width / options.height;
    if (ratio > 1.5) return 'ASPECT_16_9';
    if (ratio < 0.7) return 'ASPECT_9_16';
    if (ratio > 1.2) return 'ASPECT_4_3';
    return 'ASPECT_1_1';
  }

  private getSizeRecraft(options?: ImageGenOptions): string {
    // Recraft usa: 1024x1024, 1365x1024, 1024x1365, 1536x1024, etc.
    if (!options?.width || !options?.height) return '1024x1024';
    return `${options.width}x${options.height}`;
  }

  private async pollPrediction(predictionId: string): Promise<any> {
    for (let i = 0; i < this.maxPoll; i++) {
      await new Promise((r) => setTimeout(r, this.pollInterval));

      const res = await fetch(`${this.baseUrl}/predictions/${predictionId}`, {
        headers: { 'Authorization': `Bearer ${this.apiToken}` },
      });

      if (!res.ok) continue;

      const prediction = await res.json() as any;
      if (prediction.status === 'succeeded' || prediction.status === 'failed') {
        return prediction;
      }
    }

    throw new Error(`Replicate prediction ${predictionId} timed out after ${this.maxPoll * this.pollInterval}ms`);
  }

  /**
   * Test de conexión — verifica API token válido
   */
  async testConnection(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/account`, {
        headers: { 'Authorization': `Bearer ${this.apiToken}` },
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}
```

---

## PASO 6 — Integrar Replicate en Factory de imágenes

### Archivo: `apps/api/src/media/media-engine.service.ts`

#### Cambios en el constructor (factory switch):

```typescript
// ANTES (actual):
// switch (provider) {
//   case 'dalle':    this.imageGen = new DallEImageAdapter(...);
//   case 'huggingface': this.imageGen = new HuggingFaceImageAdapter(...);
//   case 'pollinations': this.imageGen = new PollinationsImageAdapter();
//   case 'mock':    this.imageGen = new MockImageAdapter();
// }

// DESPUÉS (agregar caso 'replicate'):
import { ReplicateImageAdapter, type ReplicateImageModel } from '@automatismos/media';

// En el switch:
case 'replicate':
  this.imageGen = new ReplicateImageAdapter({
    apiToken: this.config.get('REPLICATE_API_TOKEN') ?? '',
    defaultModel: (this.config.get('REPLICATE_DEFAULT_MODEL') ?? 'flux-schnell') as ReplicateImageModel,
  });
  break;
```

#### Cambios en resolución de credenciales de usuario:

```typescript
// En getImageGen(userId) o similar:
// Si el usuario tiene credencial REPLICATE guardada, usarla:
const userCred = await this.credService.getDecryptedPayload(userId, 'REPLICATE');
if (userCred) {
  return new ReplicateImageAdapter({
    apiToken: userCred.apiKey,
    defaultModel: userCred.model ?? 'flux-schnell',
  });
}
```

---

## PASO 7 — Selección Inteligente de Modelo de Imagen

### En `media-engine.service.ts`, nueva función:

```typescript
/**
 * Elige el mejor modelo de imagen basándose en:
 * 1. Plan del usuario (starter/creator/pro)
 * 2. Si el prompt requiere texto visible
 * 3. Balance de créditos
 * 4. Proveedor preferido del VisualStyleProfile
 */
async selectImageModel(
  workspaceId: string,
  prompt: string,
  options: { isPromotional?: boolean; hasTextOverlay?: boolean; preferredProvider?: string },
): Promise<{
  adapter: ImageGeneratorAdapter;
  model: string;
  creditCost: CreditOperationType | null; // null = gratis
}> {
  // 1. Obtener plan
  const workspace = await this.prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { plan: { select: { slug: true } } },
  });
  const plan = workspace?.plan?.slug ?? 'starter';

  // 2. Detectar si el prompt necesita texto legible
  const needsTextRender = this.detectTextInPrompt(prompt) || options.hasTextOverlay;

  // 3. Seleccionar modelo según plan y necesidades
  if (plan === 'starter') {
    // Solo modelos gratis
    return {
      adapter: this.imageGen, // Pollinations o HuggingFace
      model: 'free',
      creditCost: null,
    };
  }

  if (needsTextRender && (plan === 'pro' || plan === 'creator')) {
    // Texto perfecto: Ideogram v3 (5 créditos) — si tiene balance
    const balance = await this.creditService.getBalance(workspaceId);
    if (balance.isUnlimited || balance.currentBalance >= 5) {
      return {
        adapter: new ReplicateImageAdapter({
          apiToken: await this.getReplicateToken(workspaceId),
          defaultModel: 'ideogram-v3',
        }),
        model: 'ideogram-v3',
        creditCost: CreditOperationType.IMAGE_TEXT,
      };
    }
    // Sin créditos: usar Sharp overlay sobre imagen gratis
    return {
      adapter: this.imageGen,
      model: 'free+sharp',
      creditCost: null,
    };
  }

  if (plan === 'creator' || plan === 'pro') {
    // Calidad mejorada: Replicate Flux-schnell (1 crédito)
    return {
      adapter: new ReplicateImageAdapter({
        apiToken: await this.getReplicateToken(workspaceId),
        defaultModel: 'flux-schnell',
      }),
      model: 'flux-schnell',
      creditCost: CreditOperationType.IMAGE_STANDARD,
    };
  }

  // Fallback: modelo gratis
  return { adapter: this.imageGen, model: 'free', creditCost: null };
}

/**
 * Detecta si un prompt probablemente requiere texto renderizado
 */
private detectTextInPrompt(prompt: string): boolean {
  const textIndicators = [
    /\d+%\s*(off|descuento|dto)/i,
    /[""][^""]+[""]/,           // texto entre comillas
    /banner|flyer|poster|cartel/i,
    /text\s+saying|texto\s+que\s+diga/i,
    /\boferta\b|\bpromo\b|\bsale\b/i,
    /precio|price|\$\d+/i,
    /logo\b|logotipo\b|marca\b/i,
    /tipografía|typography|lettering|font/i,
  ];
  return textIndicators.some((re) => re.test(prompt));
}

/**
 * Obtener token de Replicate (usuario o env)
 */
private async getReplicateToken(workspaceId: string): Promise<string> {
  // 1. Buscar credencial del usuario
  try {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { ownerId: true },
    });
    if (workspace?.ownerId) {
      const cred = await this.credService?.getDecryptedPayload(workspace.ownerId, 'REPLICATE');
      if (cred?.apiKey) return cred.apiKey;
    }
  } catch {}

  // 2. Fallback a env var
  return this.config.get('REPLICATE_API_TOKEN') ?? '';
}
```

---

## PASO 8 — Adaptador Replicate Video (Wan 2.1)

### Archivo: `packages/media/src/adapters/replicate-video.ts` (NUEVO)

```typescript
import type { AvatarVideoAdapter, VideoScript, VideoGenOptions, GeneratedVideo, VideoJobStatus } from '../index';

export interface ReplicateVideoConfig {
  apiToken: string;
  defaultModel?: ReplicateVideoModel;
  maxPollAttempts?: number;
  pollIntervalMs?: number;
}

export type ReplicateVideoModel =
  | 'wan-2.1-i2v-480p'   // Image-to-Video 480p - $0.09/s
  | 'wan-2.1-i2v-720p'   // Image-to-Video 720p - $0.25/s
  | 'wan-2.1-t2v-480p'   // Text-to-Video 480p  - $0.09/s
  | 'wan-2.1-t2v-720p';  // Text-to-Video 720p  - $0.25/s

const VIDEO_MODEL_IDS: Record<ReplicateVideoModel, string> = {
  'wan-2.1-i2v-480p': 'wavespeedai/wan-2.1-i2v-480p',
  'wan-2.1-i2v-720p': 'wavespeedai/wan-2.1-i2v-720p',
  'wan-2.1-t2v-480p': 'wavespeedai/wan-2.1-t2v-480p',
  'wan-2.1-t2v-720p': 'wavespeedai/wan-2.1-t2v-720p',
};

export class ReplicateVideoAdapter implements AvatarVideoAdapter {
  private readonly apiToken: string;
  private readonly defaultModel: ReplicateVideoModel;
  private readonly maxPoll: number;
  private readonly pollInterval: number;
  private readonly baseUrl = 'https://api.replicate.com/v1';
  private readonly jobMap = new Map<string, string>(); // jobId → predictionId

  constructor(config: ReplicateVideoConfig) {
    if (!config.apiToken) throw new Error('ReplicateVideoAdapter requires apiToken');
    this.apiToken = config.apiToken;
    this.defaultModel = config.defaultModel ?? 'wan-2.1-t2v-480p';
    this.maxPoll = config.maxPollAttempts ?? 120;
    this.pollInterval = config.pollIntervalMs ?? 3000;
  }

  async generate(script: VideoScript, options?: VideoGenOptions & {
    model?: ReplicateVideoModel;
    imageUrl?: string;       // Requerido para i2v
    motionPrompt?: string;   // "zoom in slowly, rotate"
  }): Promise<GeneratedVideo> {
    const model = options?.model ?? this.defaultModel;
    const modelId = VIDEO_MODEL_IDS[model];
    const isI2V = model.includes('i2v');

    const prompt = script.blocks.map(b => b.text).join(' ');
    const totalDuration = script.totalDuration ?? script.blocks.reduce((s, b) => s + (b.duration ?? 4), 0);

    const input: Record<string, any> = {
      prompt: options?.motionPrompt ?? prompt,
      num_frames: Math.min(Math.round(totalDuration * 16), 81), // ~16fps, max 81 frames
      ...(isI2V && options?.imageUrl ? { image: options.imageUrl } : {}),
      ...(options?.aspectRatio === '9:16' ? { aspect_ratio: '9:16' } : {}),
    };

    // Crear predicción
    const res = await fetch(`${this.baseUrl}/models/${modelId}/predictions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Replicate video create failed (${res.status}): ${err}`);
    }

    const prediction = await res.json() as any;
    const jobId = `replicate_${prediction.id}`;
    this.jobMap.set(jobId, prediction.id);

    return { jobId, status: 'queued' };
  }

  async getStatus(jobId: string): Promise<VideoJobStatus> {
    const predictionId = this.jobMap.get(jobId) ?? jobId.replace('replicate_', '');

    try {
      const res = await fetch(`${this.baseUrl}/predictions/${predictionId}`, {
        headers: { 'Authorization': `Bearer ${this.apiToken}` },
      });

      if (!res.ok) return { status: 'failed', error: `HTTP ${res.status}` };

      const prediction = await res.json() as any;

      switch (prediction.status) {
        case 'starting':
        case 'processing':
          return {
            status: 'rendering',
            progress: prediction.logs ? this.parseProgress(prediction.logs) : 30,
          };
        case 'succeeded':
          const url = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
          return { status: 'completed', progress: 100, url };
        case 'failed':
          return { status: 'failed', error: prediction.error ?? 'Replicate prediction failed' };
        case 'canceled':
          return { status: 'failed', error: 'Prediction was canceled' };
        default:
          return { status: 'queued', progress: 0 };
      }
    } catch (err: any) {
      return { status: 'failed', error: err.message };
    }
  }

  private parseProgress(logs: string): number {
    // Replicate logs contain progress info like "50% complete"
    const match = logs.match(/(\d+)%/);
    return match ? parseInt(match[1]) : 30;
  }
}
```

---

## PASO 9 — Adaptador fal.ai Video (Wan 2.5)

### Archivo: `packages/media/src/adapters/fal-video.ts` (NUEVO)

```typescript
import type { AvatarVideoAdapter, VideoScript, VideoGenOptions, GeneratedVideo, VideoJobStatus } from '../index';

export interface FalVideoConfig {
  apiKey: string;
  defaultModel?: FalVideoModel;
  maxPollAttempts?: number;
  pollIntervalMs?: number;
}

export type FalVideoModel =
  | 'wan-2.5-i2v'       // Image-to-Video - $0.05/s (más barato que Replicate)
  | 'wan-2.5-t2v'       // Text-to-Video  - $0.05/s
  | 'kling-2.5-turbo'   // Muy realista   - $0.07/s
  | 'luma-ray-2';       // Cinematográfico - $0.05/s

const FAL_ENDPOINTS: Record<FalVideoModel, string> = {
  'wan-2.5-i2v': 'fal-ai/wan-i2v',
  'wan-2.5-t2v': 'fal-ai/wan-t2v',
  'kling-2.5-turbo': 'fal-ai/kling-video/v2/master/image-to-video',
  'luma-ray-2': 'fal-ai/luma-dream-machine',
};

export class FalVideoAdapter implements AvatarVideoAdapter {
  private readonly apiKey: string;
  private readonly defaultModel: FalVideoModel;
  private readonly maxPoll: number;
  private readonly pollInterval: number;
  private readonly baseUrl = 'https://queue.fal.run';
  private readonly statusUrl = 'https://queue.fal.run';

  constructor(config: FalVideoConfig) {
    if (!config.apiKey) throw new Error('FalVideoAdapter requires apiKey');
    this.apiKey = config.apiKey;
    this.defaultModel = config.defaultModel ?? 'wan-2.5-t2v';
    this.maxPoll = config.maxPollAttempts ?? 120;
    this.pollInterval = config.pollIntervalMs ?? 3000;
  }

  async generate(script: VideoScript, options?: VideoGenOptions & {
    model?: FalVideoModel;
    imageUrl?: string;
  }): Promise<GeneratedVideo> {
    const model = options?.model ?? this.defaultModel;
    const endpoint = FAL_ENDPOINTS[model];
    const prompt = script.blocks.map(b => b.text).join(' ');
    const duration = script.totalDuration ?? script.blocks.reduce((s, b) => s + (b.duration ?? 4), 0);

    const input: Record<string, any> = {
      prompt,
      duration: Math.min(duration, 10), // max 10s for most models
      aspect_ratio: options?.aspectRatio ?? '9:16',
      ...(options?.imageUrl ? { image_url: options.imageUrl } : {}),
    };

    // Submit to queue
    const res = await fetch(`${this.baseUrl}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`fal.ai submit failed (${res.status}): ${err}`);
    }

    const result = await res.json() as any;
    const requestId = result.request_id;
    const jobId = `fal_${requestId}`;

    return { jobId, status: 'queued' };
  }

  async getStatus(jobId: string): Promise<VideoJobStatus> {
    const requestId = jobId.replace('fal_', '');
    // fal.ai status endpoint
    // Intentar con cada endpoint posible (podríamos guardar el endpoint usado)
    const model = this.defaultModel;
    const endpoint = FAL_ENDPOINTS[model];

    try {
      const res = await fetch(
        `${this.statusUrl}/${endpoint}/requests/${requestId}/status`,
        { headers: { 'Authorization': `Key ${this.apiKey}` } },
      );

      if (!res.ok) return { status: 'failed', error: `HTTP ${res.status}` };

      const data = await res.json() as any;

      if (data.status === 'COMPLETED') {
        // Fetch result
        const resultRes = await fetch(
          `${this.statusUrl}/${endpoint}/requests/${requestId}`,
          { headers: { 'Authorization': `Key ${this.apiKey}` } },
        );
        const result = await resultRes.json() as any;
        const videoUrl = result.video?.url ?? result.output?.url ?? result.url;
        return { status: 'completed', progress: 100, url: videoUrl };
      }

      if (data.status === 'FAILED') {
        return { status: 'failed', error: data.error ?? 'fal.ai generation failed' };
      }

      if (data.status === 'IN_PROGRESS') {
        return { status: 'rendering', progress: 50 };
      }

      return { status: 'queued', progress: 0 };
    } catch (err: any) {
      return { status: 'failed', error: err.message };
    }
  }
}
```

---

## PASO 10 — Integrar Video en VideoTierRouter

### Archivo: `apps/api/src/video/video-tier-router.service.ts`

#### Agregar imports y registrar nuevos adaptadores:

```typescript
import { ReplicateVideoAdapter } from '@automatismos/media';
import { FalVideoAdapter } from '@automatismos/media';

// En initAdapters():

// --- Tier 1 MVP (ACTUALIZADO) ---
// Reemplazar mocks por adaptadores reales:
const replicateToken = this.config.get('REPLICATE_API_TOKEN');
if (replicateToken) {
  this.adapters.set('REPLICATE_WAN', new ReplicateVideoAdapter({
    apiToken: replicateToken,
    defaultModel: 'wan-2.1-t2v-480p',
  }));
}

const falKey = this.config.get('FAL_KEY');
if (falKey) {
  this.adapters.set('FAL_WAN', new FalVideoAdapter({
    apiKey: falKey,
    defaultModel: 'wan-2.5-t2v',
  }));
}

// --- Cascade de Tier 1 (más barato primero) ---
// getAdapter('MVP') → FAL_WAN → REPLICATE_WAN → PIKA → LUMA → MOCK
```

#### Actualizar resolveProvider:

```typescript
resolveProvider(tier: VideoTier, preferred?: VideoProviderKey): VideoProviderKey {
  if (preferred && this.adapters.has(preferred)) return preferred;

  const cascades: Record<VideoTier, VideoProviderKey[]> = {
    MVP: ['FAL_WAN', 'REPLICATE_WAN', 'PIKA', 'LUMA', 'MOCK'],
    SELFHOST: ['SVD_LOCAL', 'WAN_LOCAL', 'HUNYUAN_LOCAL', 'EDGE_TTS_COMPOSE', 'MOCK'],
    PREMIUM: ['HEYGEN', 'DID', 'HEDRA', 'REPLICATE_WAN', 'MOCK'],
  };

  const chain = cascades[tier] ?? ['MOCK'];
  for (const key of chain) {
    if (this.adapters.has(key)) return key;
  }
  return 'MOCK';
}
```

---

## PASO 11 — Composite Video Real (ffmpeg gratis)

### Archivo: `packages/media/src/adapters/composite-video.ts` (REESCRIBIR)

```typescript
import type { AvatarVideoAdapter, VideoScript, VideoGenOptions, GeneratedVideo, VideoJobStatus } from '../index';
import type { VoiceSynthesisAdapter } from './voice-synthesis';
import { execFile } from 'child_process';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

export interface CompositeVideoConfig {
  ffmpegPath?: string;        // default: 'ffmpeg'
  workDir?: string;           // default: '/tmp/syndra-composite'
  voiceAdapter?: VoiceSynthesisAdapter;
  imageAdapter?: any;         // ImageGeneratorAdapter
}

export class CompositeVideoAdapter implements AvatarVideoAdapter {
  private readonly jobs = new Map<string, { status: VideoJobStatus; outputPath?: string }>();
  private readonly ffmpeg: string;
  private readonly workDir: string;
  private readonly voice?: VoiceSynthesisAdapter;
  private readonly imageGen?: any;

  constructor(config: CompositeVideoConfig = {}) {
    this.ffmpeg = config.ffmpegPath ?? 'ffmpeg';
    this.workDir = config.workDir ?? join(process.cwd(), '.tmp', 'composite');
    this.voice = config.voiceAdapter;
    this.imageGen = config.imageAdapter;
  }

  async generate(script: VideoScript, options?: VideoGenOptions): Promise<GeneratedVideo> {
    const jobId = `composite_${randomUUID()}`;
    this.jobs.set(jobId, { status: { status: 'queued', progress: 0 } });

    // Run generation in background
    this.generateAsync(jobId, script, options).catch((err) => {
      this.jobs.set(jobId, {
        status: { status: 'failed', error: err.message },
      });
    });

    return { jobId, status: 'queued' };
  }

  private async generateAsync(jobId: string, script: VideoScript, options?: VideoGenOptions) {
    const dir = join(this.workDir, jobId);
    await mkdir(dir, { recursive: true });

    // Stage 1: Generate voice narration (20%)
    this.jobs.set(jobId, { status: { status: 'rendering', progress: 20 } });
    let audioPath: string | null = null;

    if (this.voice) {
      const fullText = script.blocks.map(b => b.text).join('. ');
      const audio = await this.voice.synthesize(fullText, {
        voiceId: options?.voiceId,
        language: options?.language ?? 'es',
      });
      // Download audio to local file
      const audioRes = await fetch(audio.url);
      const audioBuffer = Buffer.from(await audioRes.arrayBuffer());
      audioPath = join(dir, 'narration.mp3');
      await writeFile(audioPath, audioBuffer);
    }

    // Stage 2: Generate images for each block (50%)
    this.jobs.set(jobId, { status: { status: 'rendering', progress: 50 } });
    const imagePaths: string[] = [];

    for (let i = 0; i < script.blocks.length; i++) {
      if (this.imageGen) {
        const img = await this.imageGen.generate(script.blocks[i].text);
        const imgRes = await fetch(img.url);
        const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
        const imgPath = join(dir, `slide_${i}.jpg`);
        await writeFile(imgPath, imgBuffer);
        imagePaths.push(imgPath);
      }
    }

    // Stage 3: Compose with ffmpeg (80%)
    this.jobs.set(jobId, { status: { status: 'rendering', progress: 80 } });
    const outputPath = join(dir, 'output.mp4');

    // Create ffmpeg concat file
    const concatContent = imagePaths
      .map((p, i) => `file '${p}'\nduration ${script.blocks[i]?.duration ?? 4}`)
      .join('\n');
    const concatPath = join(dir, 'concat.txt');
    await writeFile(concatPath, concatContent);

    // Build ffmpeg command
    const args = [
      '-f', 'concat', '-safe', '0', '-i', concatPath,
      ...(audioPath ? ['-i', audioPath, '-shortest'] : []),
      '-vf', `scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2`,
      '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
      '-c:a', 'aac', '-b:a', '128k',
      '-y', outputPath,
    ];

    await new Promise<void>((resolve, reject) => {
      execFile(this.ffmpeg, args, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });

    // Stage 4: Done (100%)
    this.jobs.set(jobId, {
      status: { status: 'completed', progress: 100, url: `file://${outputPath}` },
      outputPath,
    });
  }

  async getStatus(jobId: string): Promise<VideoJobStatus> {
    const job = this.jobs.get(jobId);
    if (!job) return { status: 'failed', error: `Job ${jobId} not found` };
    return job.status;
  }
}
```

---

## PASO 12 — Adaptador D-ID (Avatar barato)

### Archivo: `packages/media/src/adapters/did-video.ts` (NUEVO)

```typescript
import type { AvatarVideoAdapter, VideoScript, VideoGenOptions, GeneratedVideo, VideoJobStatus } from '../index';

export interface DIDConfig {
  apiKey: string;
  defaultDriverUrl?: string; // URL of driver video (optional)
}

export class DIDVideoAdapter implements AvatarVideoAdapter {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.d-id.com';

  constructor(config: DIDConfig) {
    if (!config.apiKey) throw new Error('DIDVideoAdapter requires apiKey');
    this.apiKey = config.apiKey;
  }

  async generate(script: VideoScript, options?: VideoGenOptions & {
    sourceUrl?: string;     // URL de foto del avatar
    voiceUrl?: string;      // URL de audio pregrabado
  }): Promise<GeneratedVideo> {
    const text = script.blocks.map(b => b.text).join(' ');

    const body: any = {
      source_url: options?.sourceUrl ?? 'https://d-id-public-bucket.s3.amazonaws.com/alice.jpg',
      script: {
        type: options?.voiceUrl ? 'audio' : 'text',
        ...(options?.voiceUrl
          ? { audio_url: options.voiceUrl }
          : {
              input: text,
              provider: { type: 'microsoft', voice_id: options?.voiceId ?? 'es-AR-ElenaNeural' },
            }),
      },
      config: {
        fluent: true,
        pad_audio: 0.5,
        result_format: 'mp4',
      },
    };

    const res = await fetch(`${this.baseUrl}/talks`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`D-ID create failed (${res.status}): ${err}`);
    }

    const data = await res.json() as any;
    return { jobId: `did_${data.id}`, status: 'queued' };
  }

  async getStatus(jobId: string): Promise<VideoJobStatus> {
    const talkId = jobId.replace('did_', '');

    try {
      const res = await fetch(`${this.baseUrl}/talks/${talkId}`, {
        headers: { 'Authorization': `Basic ${this.apiKey}` },
      });

      if (!res.ok) return { status: 'failed', error: `HTTP ${res.status}` };

      const data = await res.json() as any;

      switch (data.status) {
        case 'done':
          return { status: 'completed', progress: 100, url: data.result_url };
        case 'error':
          return { status: 'failed', error: data.error?.description ?? 'D-ID error' };
        case 'created':
        case 'started':
          return { status: 'rendering', progress: 50 };
        default:
          return { status: 'queued', progress: 0 };
      }
    } catch (err: any) {
      return { status: 'failed', error: err.message };
    }
  }
}
```

---

## PASO 13 — Adaptador Hedra (Avatar ultra-barato)

### Archivo: `packages/media/src/adapters/hedra-video.ts` (NUEVO)

```typescript
import type { AvatarVideoAdapter, VideoScript, VideoGenOptions, GeneratedVideo, VideoJobStatus } from '../index';

export interface HedraConfig {
  apiKey: string;
}

/**
 * Hedra: Audio-driven face animation
 * Sube foto + audio → genera video con cara hablando
 * $9.99/mo Creator plan
 */
export class HedraVideoAdapter implements AvatarVideoAdapter {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.hedra.com/v1';

  constructor(config: HedraConfig) {
    if (!config.apiKey) throw new Error('HedraVideoAdapter requires apiKey');
    this.apiKey = config.apiKey;
  }

  async generate(script: VideoScript, options?: VideoGenOptions & {
    photoUrl?: string;       // URL de foto del avatar
    audioUrl?: string;       // URL de audio pregrabado (de Edge TTS)
  }): Promise<GeneratedVideo> {
    if (!options?.audioUrl) {
      throw new Error('Hedra requires pre-generated audio (audioUrl). Use Edge TTS first.');
    }

    const body = {
      audio_url: options.audioUrl,
      image_url: options.photoUrl ?? '',
      aspect_ratio: options?.aspectRatio ?? '9:16',
    };

    const res = await fetch(`${this.baseUrl}/characters/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Hedra create failed (${res.status}): ${err}`);
    }

    const data = await res.json() as any;
    return { jobId: `hedra_${data.job_id ?? data.id}`, status: 'queued' };
  }

  async getStatus(jobId: string): Promise<VideoJobStatus> {
    const hedraId = jobId.replace('hedra_', '');

    try {
      const res = await fetch(`${this.baseUrl}/characters/${hedraId}`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
      });

      if (!res.ok) return { status: 'failed', error: `HTTP ${res.status}` };

      const data = await res.json() as any;

      if (data.status === 'complete' || data.status === 'completed') {
        return { status: 'completed', progress: 100, url: data.video_url ?? data.url };
      }
      if (data.status === 'failed' || data.status === 'error') {
        return { status: 'failed', error: data.error ?? 'Hedra generation failed' };
      }
      return { status: 'rendering', progress: data.progress ?? 30 };
    } catch (err: any) {
      return { status: 'failed', error: err.message };
    }
  }
}
```

---

## PASO 14 — Avatar Persistente

### Archivo: `apps/api/src/avatar/avatar.service.ts` (NUEVO)

```typescript
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AvatarService {
  constructor(private readonly prisma: PrismaService) {}

  async createAvatar(workspaceId: string, data: {
    name: string;
    photoUrl: string;
    provider: 'heygen' | 'did' | 'hedra';
    voiceId?: string;
  }) {
    // Verificar que no tenga más de 3 avatares
    const count = await this.prisma.avatarProfile.count({ where: { workspaceId } });
    if (count >= 3) throw new BadRequestException('Máximo 3 avatares por workspace');

    return this.prisma.avatarProfile.create({
      data: {
        workspaceId,
        name: data.name,
        photoUrl: data.photoUrl,
        provider: data.provider,
        voiceId: data.voiceId,
        isDefault: count === 0, // primer avatar es default
      },
    });
  }

  async getDefaultAvatar(workspaceId: string) {
    return this.prisma.avatarProfile.findFirst({
      where: { workspaceId, isDefault: true },
    });
  }

  async listAvatars(workspaceId: string) {
    return this.prisma.avatarProfile.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async setDefault(workspaceId: string, avatarId: string) {
    await this.prisma.$transaction([
      this.prisma.avatarProfile.updateMany({
        where: { workspaceId },
        data: { isDefault: false },
      }),
      this.prisma.avatarProfile.update({
        where: { id: avatarId },
        data: { isDefault: true },
      }),
    ]);
  }

  async deleteAvatar(avatarId: string) {
    return this.prisma.avatarProfile.delete({ where: { id: avatarId } });
  }
}
```

---

## PASO 15 — Stripe Checkout para créditos

### Archivo: `apps/api/src/credits/stripe.service.ts` (NUEVO)

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { CREDIT_PACKAGES, CreditPackageKey } from './credits.service';

@Injectable()
export class StripeService {
  private readonly stripe: Stripe;
  private readonly webhookSecret: string;

  constructor(private readonly config: ConfigService) {
    this.stripe = new Stripe(config.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2024-06-20',
    });
    this.webhookSecret = config.get('STRIPE_WEBHOOK_SECRET') ?? '';
  }

  /**
   * Crear sesión de Stripe Checkout para compra de créditos
   */
  async createCheckoutSession(params: {
    workspaceId: string;
    packageKey: CreditPackageKey;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ url: string }> {
    const pkg = CREDIT_PACKAGES[params.packageKey];

    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: pkg.label,
            description: `${pkg.credits} créditos IA para Syndra`,
          },
          unit_amount: pkg.priceUsd, // en centavos
        },
        quantity: 1,
      }],
      metadata: {
        workspaceId: params.workspaceId,
        packageKey: params.packageKey,
        credits: String(pkg.credits),
      },
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
    });

    return { url: session.url! };
  }

  /**
   * Verificar firma del webhook de Stripe
   */
  constructEvent(payload: Buffer, signature: string): Stripe.Event {
    return this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);
  }
}
```

---

## PASO 16 — Webhook Stripe

### Archivo: `apps/api/src/credits/stripe-webhook.controller.ts` (NUEVO)

```typescript
import { Controller, Post, Req, Res, Headers, RawBodyRequest } from '@nestjs/common';
import { Request, Response } from 'express';
import { StripeService } from './stripe.service';
import { CreditService } from './credits.service';
import { CreditSource } from '@prisma/client';

@Controller('webhooks/stripe')
export class StripeWebhookController {
  constructor(
    private readonly stripeService: StripeService,
    private readonly creditService: CreditService,
  ) {}

  @Post()
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
    @Headers('stripe-signature') signature: string,
  ) {
    let event;

    try {
      event = this.stripeService.constructEvent(
        req.rawBody!,
        signature,
      );
    } catch (err: any) {
      console.error('[Stripe Webhook] Signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        const { workspaceId, credits, packageKey } = session.metadata ?? {};

        if (workspaceId && credits) {
          await this.creditService.addCredits(
            workspaceId,
            parseInt(credits),
            CreditSource.PURCHASE,
            `Compra: ${packageKey} (${credits} créditos)`,
            session.payment_intent as string,
          );
          console.log(`[Stripe] Credited ${credits} credits to workspace ${workspaceId}`);
        }
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as any;
        // Manejar devoluciones si es necesario
        console.log('[Stripe] Refund received:', charge.id);
        break;
      }
    }

    return res.json({ received: true });
  }
}
```

### IMPORTANTE — Raw Body para webhook:

```typescript
// apps/api/src/main.ts — Agregar antes de app.listen():
// Stripe necesita el raw body para verificar firma
import { NestFactory } from '@nestjs/core';
// app = await NestFactory.create(AppModule, { rawBody: true });
```

---

## PASO 17 — UI: Página /dashboard/credits

### Archivo: `apps/web/src/app/dashboard/credits/page.tsx` (NUEVO)

```tsx
'use client';

import { useState, useEffect } from 'react';
// import { apiFetch } from '@/lib/api';

interface CreditBalance {
  currentBalance: number;
  totalPurchased: number;
  totalConsumed: number;
  isUnlimited: boolean;
}

interface CreditHistory {
  id: string;
  amount: number;
  balance: number;
  source: string;
  operation: string | null;
  description: string | null;
  createdAt: string;
}

const PACKAGES = [
  { key: 'basic', credits: 100, price: '$5', perCredit: '$0.05', popular: false },
  { key: 'popular', credits: 350, price: '$15', perCredit: '$0.043', popular: true },
  { key: 'mega', credits: 1000, price: '$35', perCredit: '$0.035', popular: false },
];

const COSTS = [
  { operation: 'Imagen estándar (Flux)', credits: 1 },
  { operation: 'Imagen HD (Flux-dev)', credits: 3 },
  { operation: 'Imagen con texto (Ideogram)', credits: 5 },
  { operation: 'Animación producto (5s)', credits: 10 },
  { operation: 'Video Reel (10s)', credits: 20 },
  { operation: 'Video Avatar básico (30s)', credits: 30 },
  { operation: 'Video Avatar premium (30s)', credits: 50 },
];

export default function CreditsPage() {
  const [balance, setBalance] = useState<CreditBalance | null>(null);
  const [history, setHistory] = useState<CreditHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: fetch balance and history
    setLoading(false);
  }, []);

  return (
    <div className="space-y-8 p-6">
      <h1 className="text-2xl font-bold">Créditos IA</h1>

      {/* Balance actual */}
      <div className="rounded-xl border bg-gradient-to-r from-violet-500/10 to-purple-500/10 p-6">
        <p className="text-sm text-muted-foreground">Balance actual</p>
        <p className="text-4xl font-bold">
          {balance?.isUnlimited ? '∞ Ilimitado' : `⚡ ${balance?.currentBalance ?? 0}`}
        </p>
        {!balance?.isUnlimited && (
          <p className="mt-1 text-sm text-muted-foreground">
            {balance?.totalConsumed ?? 0} usados · {balance?.totalPurchased ?? 0} comprados
          </p>
        )}
      </div>

      {/* Paquetes de compra */}
      {!balance?.isUnlimited && (
        <div>
          <h2 className="mb-4 text-lg font-semibold">Comprar créditos</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {PACKAGES.map((pkg) => (
              <div
                key={pkg.key}
                className={`rounded-xl border p-6 transition-shadow hover:shadow-lg ${
                  pkg.popular ? 'border-violet-500 ring-2 ring-violet-500/20' : ''
                }`}
              >
                {pkg.popular && (
                  <span className="mb-2 inline-block rounded-full bg-violet-500 px-3 py-0.5 text-xs font-medium text-white">
                    Más popular
                  </span>
                )}
                <p className="text-3xl font-bold">{pkg.price}</p>
                <p className="text-lg">{pkg.credits} créditos</p>
                <p className="text-sm text-muted-foreground">{pkg.perCredit}/crédito</p>
                <button
                  className="mt-4 w-full rounded-lg bg-violet-600 py-2 text-white hover:bg-violet-700"
                  onClick={() => {/* TODO: initiate purchase */}}
                >
                  Comprar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabla de costos */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">¿Cuánto cuesta cada operación?</h2>
        <div className="rounded-xl border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-3 text-left text-sm font-medium">Operación</th>
                <th className="p-3 text-right text-sm font-medium">Créditos</th>
              </tr>
            </thead>
            <tbody>
              {COSTS.map((c) => (
                <tr key={c.operation} className="border-b last:border-0">
                  <td className="p-3 text-sm">{c.operation}</td>
                  <td className="p-3 text-right text-sm font-medium">⚡ {c.credits}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Historial */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Historial</h2>
        <div className="space-y-2">
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin transacciones aún</p>
          ) : (
            history.map((h) => (
              <div key={h.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">{h.description ?? h.operation ?? h.source}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(h.createdAt).toLocaleString('es')}
                  </p>
                </div>
                <span className={`text-sm font-bold ${h.amount > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {h.amount > 0 ? '+' : ''}{h.amount} ⚡
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## PASO 18 — UI: Widget créditos en sidebar

### Archivo: `apps/web/src/components/layout/credit-widget.tsx` (NUEVO)

```tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export function CreditWidget() {
  const [balance, setBalance] = useState<number | null>(null);
  const [isUnlimited, setIsUnlimited] = useState(false);

  useEffect(() => {
    // TODO: fetch from /api/credits/balance
    // Using workspace header
  }, []);

  if (balance === null && !isUnlimited) return null;

  const isLow = !isUnlimited && (balance ?? 0) < 10;

  return (
    <Link
      href="/dashboard/credits"
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-accent ${
        isLow ? 'border-red-500/50 bg-red-500/5' : 'border-border'
      }`}
    >
      <span className="text-lg">⚡</span>
      <span className={`font-medium ${isLow ? 'text-red-500' : ''}`}>
        {isUnlimited ? '∞' : balance}
      </span>
      <span className="text-xs text-muted-foreground">créditos</span>
      {isLow && <span className="text-xs text-red-500">¡Bajo!</span>}
    </Link>
  );
}
```

### Integrar en sidebar existente:

```tsx
// En apps/web/src/components/layout/sidebar.tsx
// Agregar antes del cierre del sidebar:
import { CreditWidget } from './credit-widget';

// Al final del sidebar, antes del </aside>:
<div className="mt-auto border-t p-3">
  <CreditWidget />
</div>
```

---

## PASO 19 — UI: Diálogo de confirmación de créditos

### Archivo: `apps/web/src/components/credits/credit-confirm-dialog.tsx` (NUEVO)

```tsx
'use client';

interface CreditConfirmDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  operation: string;     // "Imagen con texto (Ideogram)"
  cost: number;          // 5
  currentBalance: number;
}

export function CreditConfirmDialog({
  open, onConfirm, onCancel, operation, cost, currentBalance,
}: CreditConfirmDialogProps) {
  if (!open) return null;

  const hasEnough = currentBalance >= cost;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-xl bg-background p-6 shadow-xl">
        <h3 className="text-lg font-semibold">Confirmar generación</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          <strong>{operation}</strong> consume <strong>⚡ {cost} créditos</strong>
        </p>
        <p className="mt-1 text-sm">
          Balance actual: <strong>⚡ {currentBalance}</strong>
          {!hasEnough && (
            <span className="ml-2 text-red-500">(insuficiente)</span>
          )}
        </p>
        <div className="mt-4 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg border py-2 text-sm hover:bg-accent"
          >
            Cancelar
          </button>
          {hasEnough ? (
            <button
              onClick={onConfirm}
              className="flex-1 rounded-lg bg-violet-600 py-2 text-sm text-white hover:bg-violet-700"
            >
              Generar (⚡ {cost})
            </button>
          ) : (
            <a
              href="/dashboard/credits"
              className="flex-1 rounded-lg bg-violet-600 py-2 text-center text-sm text-white hover:bg-violet-700"
            >
              Comprar créditos
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## PASO 20 — Alertas de bajo saldo

### Integrar en `CreditService`:

```typescript
// En credits.service.ts, agregar al método consumeCredits():

// Después de deducir créditos, verificar si el balance es bajo
if (newBalance <= 10 && newBalance > 0) {
  // TODO: Enviar notification (Telegram, email, in-app)
  console.warn(`[Credits] Workspace ${workspaceId} low balance: ${newBalance} credits`);
}

if (newBalance === 0) {
  console.warn(`[Credits] Workspace ${workspaceId} has 0 credits remaining`);
}
```

---

## ⚙️ VARIABLES DE ENTORNO NUEVAS

Agregar a `.env.example` y `.env`:

```dotenv
# Replicate (imágenes + video)
REPLICATE_API_TOKEN=r8_xxxxxxxxxxxxxxxxxx
REPLICATE_DEFAULT_MODEL=flux-schnell

# fal.ai (video, alternativa más barata)
FAL_KEY=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# D-ID (avatar video barato)
DID_API_KEY=xxxxxxxxxxxxxxxxxx

# Hedra (avatar video ultra-barato)
HEDRA_API_KEY=xxxxxxxxxxxxxxxxxx

# Stripe (pagos)
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxx
```

---

## 📦 DEPENDENCIAS NPM NUEVAS

```bash
# En packages/media (adaptadores):
# No requiere dependencias nuevas — usa fetch nativo de Node 18+

# En apps/api (Stripe):
cd apps/api
npm install stripe

# En apps/api (raw body para webhook):
# Ya soportado por NestJS con { rawBody: true }

# Para Composite Video (opcional):
npm install fluent-ffmpeg @types/fluent-ffmpeg
# + instalar ffmpeg en el servidor: apt-get install ffmpeg
```

---

## 🧪 EXPORTS NUEVOS

### `packages/media/src/index.ts` — Agregar:

```typescript
// --- Adapters (Image) --- NUEVOS
export { ReplicateImageAdapter, type ReplicateConfig, type ReplicateImageModel } from './adapters/replicate';

// --- Adapters (Video) --- NUEVOS  
export { ReplicateVideoAdapter, type ReplicateVideoConfig, type ReplicateVideoModel } from './adapters/replicate-video';
export { FalVideoAdapter, type FalVideoConfig, type FalVideoModel } from './adapters/fal-video';
export { DIDVideoAdapter, type DIDConfig } from './adapters/did-video';
export { HedraVideoAdapter, type HedraConfig } from './adapters/hedra-video';
```

---

## 📊 RESUMEN DE ARCHIVOS

### Archivos NUEVOS (crear):

| # | Archivo | Descripción |
|---|---------|------------|
| 1 | `packages/media/src/adapters/replicate.ts` | Adaptador imágenes multi-modelo Replicate |
| 2 | `packages/media/src/adapters/replicate-video.ts` | Adaptador video Wan 2.1 via Replicate |
| 3 | `packages/media/src/adapters/fal-video.ts` | Adaptador video Wan 2.5 via fal.ai |
| 4 | `packages/media/src/adapters/did-video.ts` | Adaptador avatar D-ID |
| 5 | `packages/media/src/adapters/hedra-video.ts` | Adaptador avatar Hedra |
| 6 | `apps/api/src/credits/credits.service.ts` | Servicio completo de créditos |
| 7 | `apps/api/src/credits/credits.controller.ts` | API endpoints créditos |
| 8 | `apps/api/src/credits/credits.module.ts` | Módulo NestJS de créditos |
| 9 | `apps/api/src/credits/credit.guard.ts` | Guard para verificar créditos |
| 10 | `apps/api/src/credits/credit.interceptor.ts` | Interceptor para deducir créditos |
| 11 | `apps/api/src/credits/stripe.service.ts` | Integración Stripe Checkout |
| 12 | `apps/api/src/credits/stripe-webhook.controller.ts` | Webhook de Stripe |
| 13 | `apps/api/src/avatar/avatar.service.ts` | Servicio de avatares persistentes |
| 14 | `apps/web/src/app/dashboard/credits/page.tsx` | Página de créditos |
| 15 | `apps/web/src/components/layout/credit-widget.tsx` | Widget sidebar créditos |
| 16 | `apps/web/src/components/credits/credit-confirm-dialog.tsx` | Diálogo de confirmación |

### Archivos MODIFICADOS:

| # | Archivo | Cambios |
|---|---------|---------|
| 1 | `packages/db/prisma/schema.prisma` | +AICredit, +CreditBalance, +AvatarProfile, +enums, +VideoProvider values |
| 2 | `packages/media/src/index.ts` | +exports de nuevos adaptadores |
| 3 | `apps/api/src/app.module.ts` | +CreditsModule |
| 4 | `apps/api/src/media/media-engine.service.ts` | +Replicate en factory, +selectImageModel() |
| 5 | `apps/api/src/video/video-tier-router.service.ts` | +Replicate/fal.ai en cascades |
| 6 | `apps/api/src/main.ts` | +rawBody: true (para Stripe webhook) |
| 7 | `apps/web/src/components/layout/sidebar.tsx` | +CreditWidget |
| 8 | `.env.example` | +nuevas variables |

---

## ✅ CHECKLIST DE VERIFICACIÓN

- [ ] `npx prisma migrate dev` ejecuta sin errores
- [ ] `npx prisma generate` genera tipos correctos
- [ ] API compila sin errores TypeScript
- [ ] `GET /credits/balance` retorna balance correcto
- [ ] `GET /credits/costs` retorna tabla de costos
- [ ] `POST /credits/purchase` acredita créditos (modo dev)
- [ ] `CreditGuard` bloquea Starter en endpoints premium
- [ ] `CreditGuard` permite Pro sin verificar balance
- [ ] `CreditGuard` verifica balance para Creator
- [ ] `CreditInterceptor` descuenta créditos post-generación
- [ ] `CreditInterceptor` NO descuenta si la generación falla
- [ ] Replicate genera imágenes con flux-schnell
- [ ] Replicate genera imágenes con ideogram-v3 (texto legible)
- [ ] Replicate genera video con Wan 2.1
- [ ] fal.ai genera video con Wan 2.5
- [ ] D-ID genera video con avatar
- [ ] Composite Video genera slideshow con ffmpeg
- [ ] UI credits page muestra balance e historial
- [ ] UI sidebar widget muestra créditos
- [ ] Stripe Checkout crea sesión correctamente
- [ ] Stripe Webhook acredita créditos
- [ ] Alertas de bajo saldo funcionan
