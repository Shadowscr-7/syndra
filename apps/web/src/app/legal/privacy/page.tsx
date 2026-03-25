import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de Privacidad — Syndra',
  description: 'Política de privacidad y protección de datos de Syndra.',
};

export default function PrivacyPage() {
  return (
    <article className="prose prose-invert max-w-none legal-content">
      <h1 className="text-3xl font-extrabold mb-2"
        style={{ background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        Política de Privacidad
      </h1>
      <p className="text-sm mb-8" style={{ color: 'var(--color-text-muted)' }}>
        Última actualización: 14 de marzo de 2026
      </p>

      <Section title="1. Información que Recopilamos">
        <p>Al utilizar Syndra, recopilamos la siguiente información:</p>
        <h3 className="font-semibold mt-4 mb-2" style={{ color: 'var(--color-text-primary)' }}>Información proporcionada directamente:</h3>
        <ul>
          <li>Nombre y dirección de correo electrónico al registrarse</li>
          <li>Información del perfil de negocio (nombre de marca, industria, descripción)</li>
          <li>Credenciales de plataformas de terceros (Meta, Cloudinary, etc.) almacenadas de forma cifrada</li>
          <li>Contenido que usted crea, edita o sube a la plataforma</li>
        </ul>
        <h3 className="font-semibold mt-4 mb-2" style={{ color: 'var(--color-text-primary)' }}>Información recopilada automáticamente:</h3>
        <ul>
          <li>Datos de uso del servicio (funciones utilizadas, frecuencia de acceso)</li>
          <li>Dirección IP, tipo de navegador y sistema operativo</li>
          <li>Cookies técnicas necesarias para el funcionamiento del servicio</li>
        </ul>
      </Section>

      <Section title="2. Cómo Utilizamos su Información">
        <p>Utilizamos la información recopilada para:</p>
        <ul>
          <li>Proporcionar, mantener y mejorar el servicio Syndra</li>
          <li>Procesar pagos y gestionar suscripciones a través de PayPal</li>
          <li>Generar contenido personalizado mediante inteligencia artificial</li>
          <li>Publicar contenido en sus redes sociales según su configuración</li>
          <li>Enviar comunicaciones relacionadas con el servicio (confirmaciones, alertas, actualizaciones)</li>
          <li>Detectar y prevenir fraude o uso indebido</li>
          <li>Cumplir con obligaciones legales</li>
        </ul>
      </Section>

      <Section title="3. Procesamiento con Inteligencia Artificial">
        <p>
          Syndra utiliza modelos de inteligencia artificial de terceros (como OpenAI) para generar contenido. 
          Al usar el servicio, su información de marca y briefings de contenido pueden ser enviados a estos 
          proveedores para su procesamiento.
        </p>
        <p>
          No utilizamos su contenido para entrenar modelos de IA propios ni de terceros. 
          El procesamiento se realiza únicamente para proporcionar el servicio solicitado.
        </p>
      </Section>

      <Section title="4. Compartir Información">
        <p>No vendemos su información personal. Podemos compartir datos con:</p>
        <ul>
          <li><strong>Proveedores de servicios:</strong> PayPal (pagos), OpenAI (generación de contenido), 
          Meta (publicación en redes), Resend (correo electrónico) y otros proveedores técnicos necesarios</li>
          <li><strong>Cumplimiento legal:</strong> Cuando sea requerido por ley, orden judicial o proceso legal</li>
          <li><strong>Protección de derechos:</strong> Cuando sea necesario para proteger los derechos, 
          propiedad o seguridad de AI Vanguard, sus usuarios o el público</li>
        </ul>
      </Section>

      <Section title="5. Almacenamiento y Seguridad">
        <p>
          Sus datos se almacenan en servidores protegidos. Las credenciales de terceros se cifran 
          en reposo usando algoritmos de cifrado estándar de la industria. Las contraseñas se almacenan 
          con hash bcrypt y nunca en texto plano.
        </p>
        <p>
          Implementamos medidas de seguridad técnicas y organizativas razonables para proteger su información, 
          incluyendo HTTPS, tokens JWT, y cifrado de datos sensibles. Sin embargo, ningún sistema es 100% seguro 
          y no podemos garantizar la seguridad absoluta de sus datos.
        </p>
      </Section>

      <Section title="6. Retención de Datos">
        <p>
          Mantenemos su información mientras su cuenta esté activa o según sea necesario para proporcionar el servicio. 
          Tras la cancelación de su cuenta, podemos retener ciertos datos durante un período razonable para 
          cumplir con obligaciones legales, resolver disputas y hacer cumplir nuestros acuerdos.
        </p>
        <p>
          Puede solicitar la eliminación de su cuenta y datos asociados contactándonos directamente.
        </p>
      </Section>

      <Section title="7. Sus Derechos">
        <p>Usted tiene derecho a:</p>
        <ul>
          <li><strong>Acceso:</strong> Solicitar una copia de sus datos personales</li>
          <li><strong>Rectificación:</strong> Corregir datos inexactos o incompletos</li>
          <li><strong>Eliminación:</strong> Solicitar la eliminación de sus datos personales</li>
          <li><strong>Portabilidad:</strong> Recibir sus datos en un formato estructurado y legible por máquina</li>
          <li><strong>Oposición:</strong> Oponerse al procesamiento de sus datos en determinadas circunstancias</li>
        </ul>
        <p>
          Para ejercer cualquiera de estos derechos, contáctenos en{' '}
          <a href="mailto:soporte@aivanguard.app" className="underline" style={{ color: 'var(--color-primary-light)' }}>
            soporte@aivanguard.app
          </a>.
        </p>
      </Section>

      <Section title="8. Cookies">
        <p>
          Syndra utiliza cookies técnicas estrictamente necesarias para el funcionamiento del servicio 
          (autenticación, sesión). No utilizamos cookies de seguimiento ni de publicidad.
        </p>
      </Section>

      <Section title="9. Servicios de Terceros">
        <p>
          Syndra se integra con servicios de terceros que tienen sus propias políticas de privacidad. 
          Le recomendamos revisar las políticas de:
        </p>
        <ul>
          <li><a href="https://www.paypal.com/webapps/mpp/ua/privacy-full" className="underline" style={{ color: 'var(--color-primary-light)' }}>PayPal</a></li>
          <li><a href="https://openai.com/policies/privacy-policy" className="underline" style={{ color: 'var(--color-primary-light)' }}>OpenAI</a></li>
          <li><a href="https://www.facebook.com/privacy/policy/" className="underline" style={{ color: 'var(--color-primary-light)' }}>Meta (Facebook/Instagram)</a></li>
        </ul>
      </Section>

      <Section title="10. Menores de Edad">
        <p>
          Syndra no está dirigido a menores de 18 años. No recopilamos intencionalmente información 
          de menores de edad. Si descubrimos que hemos recopilado datos de un menor, los eliminaremos 
          de inmediato.
        </p>
      </Section>

      <Section title="11. Cambios en esta Política">
        <p>
          Podemos actualizar esta política de privacidad ocasionalmente. Notificaremos cambios 
          significativos por correo electrónico o mediante un aviso visible en la plataforma. 
          El uso continuado del servicio después de los cambios constituye la aceptación de la 
          política actualizada.
        </p>
      </Section>

      <Section title="12. Contacto">
        <p>
          Para consultas sobre privacidad o protección de datos: <br />
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
