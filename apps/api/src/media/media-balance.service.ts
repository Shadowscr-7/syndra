import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class MediaBalanceService {
  private readonly logger = new Logger(MediaBalanceService.name);
  private readonly kieApiUrl = 'https://api.kie.ai/v1/dashboard/billing/credit_grants';

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  // Se ejecuta cada 4 horas
  @Cron('0 */4 * * *')
  async checkKieBalancePeriodically() {
    this.logger.log('Comprobando saldo de KIE API...');
    const apiKey = process.env.KIE_API_KEY;

    if (!apiKey) {
      this.logger.warn('KIE_API_KEY no encontrada. Omitiendo comprobación de saldo.');
      return;
    }

    try {
      const response = await fetch(this.kieApiUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        this.logger.warn(`KIE API Balance Fetch Failed: ${response.statusText}`);
        // No enviamos el mail si falla el fetch, porque podría ser error temporal de KIE
        return;
      }

      const data: any = await response.json();
      const currentBalance = data.total_available || 0; // standard OpenAI format

      if (currentBalance < 5.0) {
        await this.triggerLowBalanceAlert(currentBalance);
      } else {
        this.logger.log(`Saldo de KIE en nivel saludable: $${currentBalance}`);
      }
    } catch (error) {
      this.logger.error('Error al comprobar el saldo de KIE:', error);
    }
  }

  private async triggerLowBalanceAlert(currentBalance: number) {
    // 1. Obtener los fondos de reserva guardados en el Ledger
    const result = await this.prisma.aiFundLedger.aggregate({
      _sum: { amount: true },
    });
    const reserveAmount = result._sum.amount || 0;

    // 2. Buscar al Administrador del sistema
    const admin = await this.prisma.user.findFirst({
      where: { role: 'ADMIN' },
    });

    if (!admin?.email) {
      this.logger.error('No se encontró cuenta ADMIN para notificar fondos bajos.');
      return;
    }

    // 3. Enviar correo de alerta
    const success = await this.emailService.send({
      to: admin.email,
      subject: `🚨 ALERTA: Saldo KIE AI Crítico ($${currentBalance.toFixed(2)})`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #d9534f;">Alerta de saldo bajo en KIE AI</h2>
          <p>Hola ${admin.name || 'Admin'},</p>
          <p>El saldo real de la API de KIE acaba de caer por debajo de los $5.00. 
             Actualmente el saldo vivo reportado es de: <strong>$${currentBalance.toFixed(2)}</strong>.</p>
          <br/>
          <div style="background-color: #f7f9fc; padding: 15px; border-radius: 8px;">
            <p>Hucha Automática de Recarga (Ledger)</p>
            <h3 style="margin: 0;">Fondo acumulado sugerido para recarga: <span style="color: #5cb85c;">$${reserveAmount.toFixed(2)}</span></h3>
          </div>
          <br/>
          <p>Por favor, ingresa a <a href="https://kie.ai/">Kie.ai</a> y realiza el top-up utilizando los fondos de reserva.</p>
        </div>
      `,
      text: `Alerta de saldo en KIE AI. Saldo actual: ${currentBalance}. Reserva en hucha: ${reserveAmount}. Por favor, recarga.`,
    });

    if (success) {
      this.logger.log(`Alerta de fondos bajos enviada a ${admin.email}`);
    }
  }

  // Se ejecuta el día 1 de cada mes a las 00:00 (o 08:00 usando horario UTC si aplica)
  @Cron('0 0 1 * *')
  async monthlyLedgerReset() {
    this.logger.log('Iniciando cierre mensual del Fondo de IA...');
    
    // Obtener la sumatoria de saldo
    const result = await this.prisma.aiFundLedger.aggregate({
      _sum: { amount: true },
    });
    const totalAccumulated = result._sum.amount || 0;

    // Buscar al admin para reporte
    const admin = await this.prisma.user.findFirst({
      where: { role: 'ADMIN' },
    });

    if (admin?.email) {
      await this.emailService.send({
        to: admin.email,
        subject: `Cierre Mensual: Fondo de IA (${new Date().toLocaleString('es-ES', { month: 'long' })})`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>📊 Cierre Mensual: Hucha de IA</h2>
            <p>Se ha realizado el balance mensual de las recargas (TOP-UPs) correspondientes a las suscripciones pagadas del último ciclo.</p>
            <div style="background-color: #f7f9fc; padding: 15px; border-radius: 8px; font-size: 18px; text-align: center;">
              Total acumulado para recarga Kie:<br/>
              <strong style="color: #007bff; font-size: 28px;">$${totalAccumulated.toFixed(2)}</strong> USD
            </div>
            <p>El Ledger interno ha sido reiniciado ($0) para comenzar contabilizar el nuevo mes.</p>
          </div>
        `,
        text: `Cierre mensual. Acumulado en el Ledger: $${totalAccumulated.toFixed(2)}`,
      });
    }

    // Insertar movimiento de RESET en el Ledger cancelando el valor anterior
    if (totalAccumulated !== 0) {
      await this.prisma.aiFundLedger.create({
        data: {
          amount: -totalAccumulated,
          reason: 'Cierre y reseteo mensual del fondo Ai',
          type: 'RESET',
        },
      });
    }

    this.logger.log(`Cierre mensual completado. Reseteado: $${totalAccumulated}`);
  }
}
