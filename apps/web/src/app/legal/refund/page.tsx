import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de Reembolsos — Syndra',
  description: 'Política de reembolsos y cancelaciones de Syndra.',
};

export default function RefundPage() {
  return (
    <article className="prose prose-invert max-w-none legal-content">
      <h1 className="text-3xl font-extrabold mb-2"
        style={{ background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        Política de Reembolsos
      </h1>
      <p className="text-sm mb-8" style={{ color: 'var(--color-text-muted)' }}>
        Última actualización: 14 de marzo de 2026
      </p>

      <Section title="1. Período de Prueba Gratuito">
        <p>
          Syndra ofrece un período de prueba gratuito de 7 días para todos los usuarios nuevos. 
          Durante este período, puede explorar la plataforma sin compromiso. No se requiere 
          método de pago para iniciar la prueba.
        </p>
        <p>
          Si decide no continuar, simplemente no active un plan de pago y su cuenta permanecerá 
          con acceso limitado al finalizar el período de prueba.
        </p>
      </Section>

      <Section title="2. Cancelación de Suscripción">
        <p>
          Puede cancelar su suscripción en cualquier momento desde la sección <strong>Planes</strong> en 
          su dashboard. Al cancelar:
        </p>
        <ul>
          <li>Su suscripción permanecerá activa hasta el final del período de facturación actual</li>
          <li>No se realizarán cobros adicionales después de la fecha de cancelación</li>
          <li>Seguirá teniendo acceso completo a las funciones de su plan hasta que expire el período pagado</li>
          <li>Una vez expirado, su cuenta pasará automáticamente al nivel básico con acceso limitado</li>
        </ul>
      </Section>

      <Section title="3. Política de Reembolsos">
        <p>
          Debido a la naturaleza digital del servicio y al consumo de recursos de IA durante su uso, 
          nuestra política de reembolsos es la siguiente:
        </p>

        <h3 className="font-semibold mt-4 mb-2" style={{ color: 'var(--color-text-primary)' }}>Suscripciones mensuales:</h3>
        <ul>
          <li>
            <strong>Primeros 48 horas:</strong> Si solicita reembolso dentro de las primeras 48 horas 
            después de su primer pago y no ha generado contenido significativo, procesaremos un reembolso 
            completo.
          </li>
          <li>
            <strong>Después de 48 horas:</strong> No se ofrecen reembolsos parciales para el mes en curso. 
            Puede cancelar para evitar el siguiente cobro.
          </li>
        </ul>

        <h3 className="font-semibold mt-4 mb-2" style={{ color: 'var(--color-text-primary)' }}>Suscripciones anuales:</h3>
        <ul>
          <li>
            <strong>Primeros 14 días:</strong> Si solicita reembolso dentro de los primeros 14 días 
            de una suscripción anual, se procesará un reembolso proporcional (descontando los días utilizados 
            a tarifa mensual regular).
          </li>
          <li>
            <strong>Después de 14 días:</strong> No se ofrecen reembolsos. Puede cancelar para evitar 
            la renovación automática.
          </li>
        </ul>
      </Section>

      <Section title="4. Excepciones">
        <p>Podremos considerar reembolsos fuera de estos plazos en los siguientes casos:</p>
        <ul>
          <li>Cobros duplicados o errores en la facturación</li>
          <li>Interrupción prolongada del servicio causada por nosotros (más de 72 horas consecutivas)</li>
          <li>Cambios significativos en las funcionalidades del plan sin aviso previo</li>
        </ul>
      </Section>

      <Section title="5. Cómo Solicitar un Reembolso">
        <p>Para solicitar un reembolso:</p>
        <ol className="list-decimal list-inside space-y-2">
          <li>
            Envíe un correo a{' '}
            <a href="mailto:soporte@aivanguard.app" className="underline" style={{ color: 'var(--color-primary-light)' }}>
              soporte@aivanguard.app
            </a>{' '}
            con el asunto &quot;Solicitud de reembolso&quot;
          </li>
          <li>Incluya su correo electrónico de registro y la fecha del cobro</li>
          <li>Indique brevemente el motivo de su solicitud</li>
        </ol>
        <p>
          Procesaremos las solicitudes en un plazo máximo de 5 días hábiles. Los reembolsos 
          se realizan a través del mismo método de pago original (PayPal) y pueden tardar 
          entre 5 y 10 días hábiles adicionales en reflejarse en su cuenta.
        </p>
      </Section>

      <Section title="6. Créditos y Compras Adicionales">
        <p>
          Las compras de créditos adicionales para funciones premium (generación de video, 
          servicios de IA avanzados, etc.) no son reembolsables una vez utilizados. 
          Los créditos no utilizados no caducan mientras su cuenta esté activa.
        </p>
      </Section>

      <Section title="7. Contacto">
        <p>
          Para cualquier consulta relacionada con facturación o reembolsos: <br />
          <a href="mailto:soporte@aivanguard.app" className="underline" style={{ color: 'var(--color-primary-light)' }}>
            soporte@aivanguard.app
          </a>
        </p>
      </Section>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-xl font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
        {children}
      </div>
    </section>
  );
}
