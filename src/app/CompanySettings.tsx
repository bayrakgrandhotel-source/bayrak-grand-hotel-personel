"use client";
import {useEffect,useState} from "react";
import type {FormEvent} from "react";
import type {SupabaseClient} from "@supabase/supabase-js";

type Settings={
 company_name:string;
 manager_name:string;
 manager_email:string;
 manager_phone:string;
};
const empty=(managerName:string):Settings=>({
 company_name:"BAYRAK GRAND HOTEL",
 manager_name:managerName,
 manager_email:"",
 manager_phone:""
});

export default function CompanySettings({sb,managerId,managerName}:{
 sb:SupabaseClient;managerId:string;managerName:string;
}){
 const [form,setForm]=useState<Settings>(()=>empty(managerName));
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState("");
 const [success,setSuccess]=useState("");
 const [saved,setSaved]=useState(false);

 useEffect(()=>{
  let alive=true;
  async function load(){
   try{
    const {data,error:loadError}=await sb.from("hotel_company_settings")
     .select("company_name,manager_name,manager_email,manager_phone").eq("id",1).maybeSingle();
    if(!alive)return;
    if(loadError)throw loadError;
    if(data){setForm({company_name:data.company_name,manager_name:data.manager_name,manager_email:data.manager_email,manager_phone:data.manager_phone});setSaved(true);}
   }catch(err){if(alive)setError(err instanceof Error?err.message:"Ayarlar yüklenemedi.");}
   finally{if(alive)setLoading(false);}
  }
  void load();
  return()=>{alive=false};
 },[sb,managerId]);

 function change(field:keyof Settings,value:string){
  setForm(v=>({...v,[field]:value}));setSuccess("");
 }
 async function save(e:FormEvent<HTMLFormElement>){
  e.preventDefault();
  if(loading||saving)return;
  const company_name=form.company_name.trim(),manager_name=form.manager_name.trim(),manager_email=form.manager_email.trim().toLowerCase(),manager_phone=form.manager_phone.trim();
  if(company_name.length<2||manager_name.length<2||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(manager_email)||manager_phone.replace(/\D/g,"").length<10){
   setError("Lütfen yıldızlı alanları doğru ve eksiksiz doldurun.");return;
  }
  setSaving(true);setError("");setSuccess("");
  try{
   const {data,error:saveError}=await sb.from("hotel_company_settings").upsert({
    id:1,company_name,manager_name,manager_email,manager_phone,
    updated_by:managerId,updated_at:new Date().toISOString()
   },{onConflict:"id"}).select("company_name,manager_name,manager_email,manager_phone").single();
   if(saveError)throw saveError;
   if(!data)throw Error("Ayarlar kaydedilemedi.");
   setForm(data);setSaved(true);setSuccess("Şirket ve yönetici bilgileri kaydedildi.");
  }catch(err){setError(err instanceof Error?err.message:"Ayarlar kaydedilemedi.");}
  finally{setSaving(false)}
 }
 return <section className="panel company-settings-panel">
   <h2>Şirket Ayarları</h2>
   <p className="muted">Otelin ve sorumlu yöneticinin iletişim bilgilerini buradan düzenleyebilirsiniz.</p>
   {loading?<p className="muted" style={{marginTop:18}}>Bilgiler yükleniyor...</p>:
    <form className="company-settings-form" onSubmit={save}>
     <label>Şirket Adı (*)<input name="company_name" type="text" autoComplete="organization" required minLength={2} maxLength={150} value={form.company_name} onChange={e=>change("company_name",e.target.value)} placeholder="BAYRAK GRAND HOTEL"/></label>
     <label>Yönetici Adı (*)<input name="manager_name" type="text" required minLength={2} maxLength={150} value={form.manager_name} onChange={e=>change("manager_name",e.target.value)} placeholder="Yönetici adı soyadı"/></label>
     <label>Yönetici E-posta (*)<input name="manager_email" type="email" autoComplete="email" required maxLength={254} value={form.manager_email} onChange={e=>change("manager_email",e.target.value)} placeholder="ornek@hotel.com"/></label>
     <label>Yönetici Telefon (*)<input name="manager_phone" type="tel" autoComplete="tel" required minLength={10} maxLength={25} value={form.manager_phone} onChange={e=>change("manager_phone",e.target.value)} placeholder="05xx xxx xx xx"/></label>
     <div className="company-settings-footer">
      <p className="muted">(*) işaretli alanlar zorunludur.</p>
      <button disabled={saving} type="submit">{saving?"Kaydediliyor...":saved?"Değişiklikleri Kaydet":"Bilgileri Kaydet"}</button>
     </div>
    </form>}
   {error&&<p className="error" role="alert">{error}</p>}
   {success&&<p className="success" role="status">{success}</p>}
   <p className="hint">Bu iletişim bilgileri, yönetici hesabınızın giriş kullanıcı adını veya şifresini değiştirmez.</p>
 </section>;
}
