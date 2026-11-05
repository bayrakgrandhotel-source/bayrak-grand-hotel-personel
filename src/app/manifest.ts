import type {MetadataRoute} from "next";
export default function manifest():MetadataRoute.Manifest{
 return {
  id:"/",
  name:"Bayrak Grand Hotel Personel Takip",
  short_name:"Bayrak Personel",
  description:"Bayrak Grand Hotel personel giriş, çıkış ve izin takip sistemi",
  start_url:"/",
  scope:"/",
  display:"standalone",
  background_color:"#FAF8F3",
  theme_color:"#C9A35A",
  lang:"tr",
  icons:[
   {src:"/app-icon-192?v=20261105",sizes:"192x192",type:"image/png",purpose:"any"},
   {src:"/app-icon-512?v=20261105",sizes:"512x512",type:"image/png",purpose:"any"}
  ]
 };
}
