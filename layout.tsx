import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Bayrak Grand Hotel | Personel Takip', description: 'Bayrak Grand Hotel personel takip sistemi' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="tr"><body>{children}</body></html>; }
