export const dynamic = "force-static";
import type {MetadataRoute} from "next";
export default function manifest():MetadataRoute.Manifest{
 return {
  id:"/bayrak-grand-hotel-personel/",
  name:"Bayrak Grand Hotel Personel Takip",
  short_name:"Bayrak Personel",
  description:"Bayrak Grand Hotel personel giriş, çıkış ve izin takip sistemi",
  start_url:"/bayrak-grand-hotel-personel/",
  scope:"/bayrak-grand-hotel-personel/",
  display:"standalone",
  background_color:"#FAF8F3",
  theme_color:"#C9A35A",
  lang:"tr",
  icons:[
   {src:"/bayrak-grand-hotel-personel/app-icon-192?v=20261105-logo2",sizes:"192x192",type:"image/png",purpose:"any"},
   {src:"/bayrak-grand-hotel-personel/app-icon-512?v=20261105-logo2",sizes:"512x512",type:"image/png",purpose:"any"}
  ]
 };
}
