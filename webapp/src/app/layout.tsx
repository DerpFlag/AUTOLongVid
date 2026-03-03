import type { Metadata } from "next";
import Image from "next/image";
import { Orbitron, JetBrains_Mono } from 'next/font/google';
import "./globals.css";

const orbitron = Orbitron({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-heading',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: "Automated Long Format Text to Video Pipeline — Cloud Studio",
  description: "Generate AI videos entirely in the cloud. Script → Voice → Images → Video — zero local compute.",
  icons: {
    icon: "/logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${orbitron.variable} ${jetbrainsMono.variable}`}>
      <body className={jetbrainsMono.className}>
        <header className="app-header">
          <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <Image
                src="/logo.png"
                alt="AUTOLongVid logo"
                width={160}
                height={48}
                priority
                className="header-logo"
              />
            </div>
            <span
              className="header-credit"
              style={{
                fontSize: '0.75rem',
                fontFamily: 'var(--font-heading), monospace',
                color: 'var(--mutedForeground)',
                letterSpacing: '0.1em',
              }}
            >
              Made by Anas Riaz
            </span>
          </div>
        </header>
        <main style={{ position: 'relative', zIndex: 1 }}>
          {children}
        </main>
      </body>
    </html>
  );
}
