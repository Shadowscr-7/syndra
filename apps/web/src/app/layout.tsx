import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Syndra — AI Content Automation',
  description:
    'Plataforma de automatización de contenido para Instagram y Facebook con IA y aprobación humana.',
  icons: {
    icon: '/images/icono.png',
    shortcut: '/images/icono.png',
    apple: '/images/icono.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <meta name="facebook-domain-verification" content="4dtpasqxau99nimqo3wxt36h6k1hf8" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
