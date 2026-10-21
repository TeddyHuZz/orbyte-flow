import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Orbyte Flow — AI Floating HUD for WhatsApp Web & LHDN e-Invoicing',
  description:
    'AI-powered floating command overlay for WhatsApp Web turning unstructured chats into pre-validated Quotations, Purchase Orders, and LHDN e-invoices with zero data re-entry.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full dark antialiased">
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100 font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
        {children}
      </body>
    </html>
  );
}
