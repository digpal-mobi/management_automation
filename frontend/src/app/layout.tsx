import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/layout/Providers';
import { Navbar } from '@/components/layout/Navbar';

export const metadata: Metadata = {
  title: 'TaskPulse AI | Autonomous Project Management & Ticket Generation',
  description: 'AI-powered developer project management system with autonomous ticket generation, pgvector RAG memory, and Kanban workflows.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#000000] text-white antialiased selection:bg-white selection:text-black">
        <Providers>
          <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
