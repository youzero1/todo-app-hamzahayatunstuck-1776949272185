import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Todo App',
  description: 'A simple and beautiful todo application',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 min-h-screen">
        {children}
      </body>
    </html>
  );
}
