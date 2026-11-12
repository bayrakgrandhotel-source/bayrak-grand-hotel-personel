import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = { title:"Bayrak Grand Hotel | Personel Takip", description:"Bayrak Grand Hotel güvenli personel takip uygulaması", manifest:"/bayrak-grand-hotel-personel/manifest.webmanifest", icons:{icon:[{url:"/bayrak-grand-hotel-personel/icon?v=20261105-logo2",type:"image/png",sizes:"64x64"}],apple:[{url:"/bayrak-grand-hotel-personel/apple-icon?v=20261105-logo2",sizes:"180x180",type:"image/png"}]} };
export const viewport: Viewport = { width:"device-width", initialScale:1, themeColor:"#C9A35A" };
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="tr"><body>{children}</body></html>}
