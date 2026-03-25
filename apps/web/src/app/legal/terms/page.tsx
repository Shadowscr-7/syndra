import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Términos de Servicio — Syndra',
  description: 'Términos y condiciones de uso de la plataforma Syndra.',
};

export default function TermsPage() {
  return (
    <article className="prose prose-invert max-w-none legal-content">
      <h1 className="text-3xl font-extrabold mb-2"
        style={{ background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        Términos de Servicio
      </h1>
      <p className="text-sm mb-8" style={{ color: 'var(--color-text-muted)' }}>
        Última actualización: 14 de marzo de 2026
      </p>

      <Section title="1. Aceptación de los Términos">
        <p>
          Al acceder y utilizar Syndra (<strong>syndra.aivanguard.app</strong>), una plataforma operada por 
          AI Vanguard (en adelante, &quot;nosotros&quot;, &quot;nuestro&quot; o &quot;la Empresa&quot;), usted acepta estar 
          obligado por estos Términos de Servicio. Si no está de acuerdo con alguna parte de estos términos, 
          no deberá utilizar nuestro servicio.
        </p>
      </Section>

      <Section title="2. Descripción del Servicio">
        <p>
          Syndra es una plataforma SaaS de automatización de contenido para redes sociales impulsada por 
          inteligencia artificial. El servicio incluye, entre otras funcionalidades:
        </p>
        <ul>
          <li>Generación automática de contenido textual y visual con IA</li>
          <li>Planificación y programación editorial</li>
          <li>Publicación automatizada en redes sociales (Instagram, Facebook, etc.)</li>
          <li>Análisis de rendimiento y recomendaciones</li>
          <li>Gestión de marca y perfiles de negocio</li>
        </ul>
      </Section>

      <Section title="3. Registro y Cuentas">
        <p>
          Para utilizar Syndra, debe crear una cuenta proporcionando información veraz y actualizada. 
          Usted es responsable de mantener la confidencialidad de sus credenciales de acceso y de todas 
          las actividades que ocurran bajo su cuenta.
        </p>
        <p>
          Nos reservamos el derecho de suspender o terminar cuentas que violen estos términos, 
          presenten actividad fraudulenta, o permanezcan inactivas por un período prolongado.
        </p>
      </Section>

      <Section title="4. Planes y Pagos">
        <p>Syndra ofrece los siguientes planes de suscripción:</p>
        <ul>
          <li><strong>Starter</strong> — $15 USD/mes (o $150 USD/año)</li>
          <li><strong>Creator</strong> — $39 USD/mes (o $390 USD/año)</li>
          <li><strong>Pro</strong> — $99 USD/mes (o $990 USD/año)</li>
        </ul>
        <p>
          Los pagos se procesan a través de PayPal. Al suscribirse, usted autoriza el cobro 
          recurrente según la periodicidad elegida (mensual o anual). Los precios pueden cambiar 
          con notificación previa de al menos 30 días.
        </p>
        <p>
          Al registrarse, recibirá un período de prueba gratuito de 7 días. Si no activa un plan 
          de pago antes de que finalice el período de prueba, su acceso será limitado.
        </p>
      </Section>

      <Section title="5. Uso Aceptable">
        <p>Usted se compromete a no utilizar Syndra para:</p>
        <ul>
          <li>Generar, distribuir o promover contenido ilegal, difamatorio, obsceno o que incite al odio</li>
          <li>Violar derechos de propiedad intelectual de terceros</li>
          <li>Enviar spam o contenido no solicitado masivo</li>
          <li>Intentar acceder a cuentas o datos de otros usuarios</li>
          <li>Realizar ingeniería inversa, descompilar o desensamblar el software</li>
          <li>Usar el servicio de manera que pueda dañar, deshabilitar o sobrecargar nuestros servidores</li>
        </ul>
      </Section>

      <Section title="6. Propiedad Intelectual">
        <p>
          El contenido generado por la IA a través de Syndra pertenece al usuario que lo creó, 
          sujeto a las licencias de los modelos de IA subyacentes. Syndra y AI Vanguard retienen 
          todos los derechos sobre la plataforma, su código fuente, diseño, marca y tecnología.
        </p>
        <p>
          Usted nos otorga una licencia limitada para procesar su contenido con el único propósito 
          de proporcionar el servicio.
        </p>
      </Section>

      <Section title="7. Credenciales de Terceros">
        <p>
          Syndra puede requerir que conecte cuentas de terceros (Meta, Cloudinary, etc.) para 
          funcionalidades específicas. Estas credenciales se almacenan de forma cifrada. Usted es 
          responsable de cumplir con los términos de servicio de dichos terceros.
        </p>
      </Section>

      <Section title="8. Limitación de Responsabilidad">
        <p>
          Syndra se proporciona &quot;tal cual&quot; y &quot;según disponibilidad&quot;. No garantizamos que el servicio 
          sea ininterrumpido, libre de errores o que los resultados de la IA sean precisos en todo momento.
        </p>
        <p>
          En la máxima medida permitida por la ley, AI Vanguard no será responsable por daños 
          indirectos, incidentales, especiales o consecuentes derivados del uso de Syndra, incluyendo 
          pero no limitado a pérdida de datos, pérdida de beneficios o interrupción del negocio.
        </p>
        <p>
          Nuestra responsabilidad total se limita al monto pagado por usted en los últimos 12 meses.
        </p>
      </Section>

      <Section title="9. Modificaciones del Servicio">
        <p>
          Nos reservamos el derecho de modificar, suspender o descontinuar cualquier aspecto de Syndra 
          en cualquier momento. Intentaremos notificar cambios significativos con antelación razonable.
        </p>
      </Section>

      <Section title="10. Terminación">
        <p>
          Usted puede cancelar su suscripción en cualquier momento desde la sección de Planes del dashboard. 
          La cancelación será efectiva al final del período de facturación actual.
        </p>
        <p>
          Nos reservamos el derecho de terminar su cuenta por violación de estos términos, con o sin aviso previo.
        </p>
      </Section>

      <Section title="11. Ley Aplicable">
        <p>
          Estos términos se regirán e interpretarán de acuerdo con las leyes aplicables. 
          Cualquier disputa se resolverá preferentemente mediante negociación directa y, en su defecto, 
          ante los tribunales competentes.
        </p>
      </Section>

      <Section title="12. Contacto">
        <p>
          Para consultas sobre estos términos, contáctenos en: <br />
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
