import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = { title:"Bayrak Grand Hotel | Personel Takip", description:"Bayrak Grand Hotel güvenli personel takip uygulaması", manifest:"/manifest.webmanifest" };
export const viewport: Viewport = { width:"device-width", initialScale:1, themeColor:"#211910" };
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="tr"><body>{children}</body></html>}
