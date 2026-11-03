"use client";
import {useEffect,useState} from "react";
import type {FormEvent} from "react";
import type {SupabaseClient} from "@supabase/supabase-js";
export type StaffDetails={id:string;username:string;full_name:string;active:boolean;first_name?:string|null;last_name?:string|null;phone?:string|null;contact_email?:string|null;employee_no?:string|null;date_of_birth?:string|null;hire_date?:string|null;work_schedule?:string|null;department?:string|null;job_title?:string|null;monthly_salary?:number|null;staff_note?:string|null;photo_path?:string|null};
type Mode="return"|"new"|"edit";
const init=(s?:StaffDetails|null)=>{const parts=(s?.full_name||"").trim().split(/\s+/);return {first_name:s?.first_name||parts[0]||"",last_name:s?.last_name||parts.slice(1).join(" ")||"",phone:s?.phone||"",work_schedule:s?.work_schedule||"",contact_email:s?.contact_email||"",employee_no:s?.employee_no||"",date_of_birth:s?.date_of_birth||"",hire_date:s?.hire_date||"",department:s?.department||"",job_title:s?.job_title||"",monthly_salary:s?.monthly_salary==null?"":String(s.monthly_salary),staff_note:s?.staff_note||"",username:s?.username||"",password:""}};
export default function StaffManagement({sb,staff,onCreate,onSaved}:{sb:SupabaseClient;staff:StaffDetails[];onCreate:(data:Record<string,unknown>)=>Promise<{id?:string}>;onSaved:()=>Promise<void>}){
 const [selected,setSelected]=useState<StaffDetails|null>(null),[editing,setEditing]=useState(false),[form,setForm]=useState(init()),[busy,setBusy]=useState(false),[error,setError]=useState(""),[success,setSuccess]=useState(""),[search,setSearch]=useState("");
 const [photo,setPhoto]=useState<File|null>(null),[photoUrl,setPhotoUrl]=useState("");
 useEffect(()=>{let ok=true;setPhotoUrl("");if(!selected?.photo_path)return;sb.storage.from("hotel-staff-photos").createSignedUrl(selected.photo_path,1800).then(({data})=>{if(ok&&data?.signedUrl)setPhotoUrl(data.signedUrl)});return()=>{ok=false}},[selected?.photo_path,sb]);
 const open=(s?:StaffDetails)=>{setSelected(s||null);setEditing(true);setForm(init(s));setError("");setSuccess("");setPhoto(null)};
 const back=()=>{setEditing(false);setSelected(null);setPhoto(null);setError("")};
 const field=(name:keyof ReturnType<typeof init>,value:string)=>setForm(p=>({...p,[name]:value}));
 async function save(e:FormEvent<HTMLFormElement>,mode:Mode){e.preventDefault();if(busy)return;
  const first_name=form.first_name.trim(),last_name=form.last_name.trim(),phone=form.phone.trim(),work_schedule=form.work_schedule.trim();
  if(first_name.length<2||last_name.length<2||phone.replace(/\D/g,"").length<10||!work_schedule){setError("Yıldızlı alanları kontrol edin.");return}
  const data:Record<string,unknown>={first_name,last_name,phone,work_schedule,full_name:first_name+" "+last_name,contact_email:form.contact_email||null,employee_no:form.employee_no||null,date_of_birth:form.date_of_birth||null,hire_date:form.hire_date||null,department:form.department||null,job_title:form.job_title||null,monthly_salary:form.monthly_salary===""?null:Number(form.monthly_salary),staff_note:form.staff_note||null};
  setBusy(true);setError("");setSuccess("");
  try{
   let id=selected?.id;let path=selected?.photo_path||null;
   if(selected){const {error}=await sb.from("hotel_profiles").update(data).eq("id",selected.id);if(error)throw error}
   else{const res=await onCreate({...data,username:form.username,password:form.password});id=res.id;if(!id)throw Error("Yeni personel kimliği alınamadı")}
   if(photo&&id){if(photo.size>2097152||!["image/png","image/jpeg","image/webp"].includes(photo.type))throw Error("Fotoğraf en fazla 2 MB ve JPG, PNG veya WEBP olmalı");
    path=id+"/"+crypto.randomUUID()+"."+(photo.type==="image/png"?"png":photo.type==="image/webp"?"webp":"jpg");
    const {error:up}=await sb.storage.from("hotel-staff-photos").upload(path,photo,{contentType:photo.type});if(up)throw up;
    const {error:up2}=await sb.from("hotel_profiles").update({photo_path:path}).eq("id",id);if(up2)throw up2;
   }
   await onSaved();setPhoto(null);
   if(mode==="return")back();
   else if(mode==="new"){setSelected(null);setForm(init());setPhotoUrl("")}
   else {setSelected({...(selected||{id:id!,username:form.username,full_name:first_name+" "+last_name,active:true}),...data,photo_path:path} as StaffDetails);setForm(x=>({...x,password:""}))}
   setSuccess("Personel bilgileri kaydedildi.");
  }catch(ex){setError(ex instanceof Error?ex.message:"Kaydetme hatası")}finally{setBusy(false)}
 }
 const input=(name:keyof ReturnType<typeof init>,label:string,required=false,type="text")=><label key={name}>{label}{required?" (*)":""}<input required={required} type={type} value={form[name]} onChange={e=>field(name,e.target.value)} minLength={required?2:undefined}/></label>;
 return <section className="staff-management">
 <div className="staff-management-title"><div><h2>Personel</h2><p className="muted">Personel bilgileri ve kullanıcı hesapları</p></div>{editing?<div className="actions"><button disabled={busy} type="submit" form="staff-entry" name="mode" value="return">Kaydet & Geri Dön</button><button disabled={busy} type="submit" form="staff-entry" name="mode" value="new">Kaydet & Yeni Ekle</button><button disabled={busy} type="submit" form="staff-entry" name="mode" value="edit">Kaydet & Düzenle</button><button className="secondary" onClick={back}>Geri Dön</button></div>:<button onClick={()=>open()}>+ Yeni Personel</button>}</div>
 {error&&<p className="error">{error}</p>}{success&&<p className="success">{success}</p>}
 {editing?<div className="panel"><h3>Kullanıcı Bilgileri</h3><form id="staff-entry" onSubmit={e=>void save(e,((e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement|null)?.value as Mode||"return")} className="staff-detail-form">
 <label>Fotoğraf<div className="staff-image-input">{photo?<span>Seçildi: {photo.name}</span>:photoUrl?<img src={photoUrl} alt="Personel" width={60} height={70}/>:<span>Görsel yok</span>}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>setPhoto(e.target.files?.[0]||null)}/></div></label>
 {input("employee_no","Sicil No.")}{input("first_name","Ad",true)}{input("last_name","Soyad",true)}{input("contact_email","E-posta (zorunlu değil)",false,"email")}{input("phone","Telefon",true,"tel")}{input("date_of_birth","Doğum Tarihi",false,"date")}
 <label>Çalışma Saati (*)<input required value={form.work_schedule} onChange={e=>field("work_schedule",e.target.value)} placeholder="09:00 - 18:00 veya Değişken vardiya" list="shifts"/><datalist id="shifts"><option value="07:00 - 15:00"/><option value="08:00 - 17:00"/><option value="09:00 - 18:00"/><option value="15:00 - 23:00"/><option value="23:00 - 07:00"/><option value="Değişken vardiya"/></datalist></label>
 {input("hire_date","İşe Başlama",false,"date")}{input("department","Departman")}{input("job_title","Görev")}{input("monthly_salary","Aylık Maaş (₺)",false,"number")}
 <label>Personel Notu<textarea rows={3} value={form.staff_note} onChange={e=>field("staff_note",e.target.value)}/></label>
 <h3>Uygulama Hesabı</h3><label>Kullanıcı Adı (*)<input required value={form.username} disabled={!!selected} onChange={e=>field("username",e.target.value.toLowerCase())} pattern="[a-z0-9._-]{3,30}"/></label>
 {!selected&&<label>Şifre (*)<input required minLength={8} type="password" value={form.password} onChange={e=>field("password",e.target.value)}/></label>}
 <button disabled={busy}>Kaydet</button>
 </form></div>:<div className="panel"><div className="staff-list-tools"><h3>Personel Listesi ({staff.length})</h3><input placeholder="Personel ara..." value={search} onChange={e=>setSearch(e.target.value)}/></div>{staff.filter(s=>s.full_name.toLowerCase().includes(search.toLowerCase())||s.username.includes(search)).map(s=><div className="row" key={s.id}><div><b>{s.full_name}</b><p className="muted">@{s.username} · {s.active?"Aktif":"Pasif"}</p></div><button onClick={()=>open(s)} className="secondary">Bilgileri Düzenle</button></div>)}</div>}
 </section>;
