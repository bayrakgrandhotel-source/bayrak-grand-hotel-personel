"use client";
import {createClient} from "@supabase/supabase-js";
import {useEffect,useState} from "react";
import type {FormEvent} from "react";

const SB_URL="https://wksbzfrpyrjzopoxnajc.supabase.co";
const SB_KEY="sb_publishable_pzEUUtm95mpq3vynU2rVWQ_Z_82dfjl";
const sb=createClient(SB_URL,SB_KEY,{auth:{persistSession:true,autoRefreshToken:true}});
const email=(s:string)=>s.trim().toLowerCase()+"@personel.bayrak.example";
type Profile={id:string;username:string;full_name:string;login_email:string;role:"manager"|"staff";active:boolean};
type Shift={id:string;staff_id:string;work_date:string;check_in:string;check_out:string|null};
type Advance={id:string;staff_id:string;advance_date:string;amount:number;note:string|null};
type DayOff={id:string;staff_id:string;leave_date:string;note:string|null};
type Tab="personel"|"mesai"|"avans"|"izin";
const day=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Istanbul",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const stamp=(value:string|null)=>value?new Date(value).toLocaleString("tr-TR",{timeZone:"Europe/Istanbul",dateStyle:"short",timeStyle:"short"}):"—";
const tl=(v:number)=>Number(v||0).toLocaleString("tr-TR",{style:"currency",currency:"TRY"});
const localTime=(s:string|null)=>s?new Date(new Date(s).getTime()-new Date(s).getTimezoneOffset()*60000).toISOString().slice(0,16):"";
const values=(e:FormEvent<HTMLFormElement>)=>Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string,string>;

export default function Home(){
 const [profile,setProfile]=useState<Profile|null>(null);
 const [users,setUsers]=useState<Profile[]>([]);
 const [shifts,setShifts]=useState<Shift[]>([]);
 const [advances,setAdvances]=useState<Advance[]>([]);
 const [daysOff,setDaysOff]=useState<DayOff[]>([]);
 const [tab,setTab]=useState<Tab>("mesai");
 const [setup,setSetup]=useState(false);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [success,setSuccess]=useState("");
 const [editShift,setEditShift]=useState<Shift|null>(null);
 const [editAdvance,setEditAdvance]=useState<Advance|null>(null);
 const [editDay,setEditDay]=useState<DayOff|null>(null);
 const manager=profile?.role==="manager";
 const tell=(message:string,failed=false)=>{setError(failed?message:"");setSuccess(failed?"":message)};
 const handleError=(err:unknown)=>tell(err instanceof Error?err.message:"İşlem başarısız.",true);
 async function api(data:Record<string,unknown>){
   const {data:{session}}=await sb.auth.getSession();
   const response=await fetch(SB_URL+"/functions/v1/hotel-api",{
     method:"POST",
     headers:{"content-type":"application/json",apikey:SB_KEY,...(session?{authorization:"Bearer "+session.access_token}:{})},
     body:JSON.stringify(data)});
   const payload=await response.json();
   if(!response.ok||payload.error)throw Error(payload.error||"İşlem başarısız.");
   return payload;
 }
 async function refresh(){
   const {data:{user},error:authError}=await sb.auth.getUser();
   if(authError||!user){setProfile(null);setLoading(false);return}
   const {data:me,error:pErr}=await sb.from("hotel_profiles").select("*").eq("id",user.id).maybeSingle();
   if(pErr||!me||!me.active){await sb.auth.signOut();setProfile(null);setLoading(false);tell("Hesap bulunamadı veya pasif durumda.",true);return}
   const isManager=me.role==="manager";
   const p=isManager?sb.from("hotel_profiles").select("*"):sb.from("hotel_profiles").select("*").eq("id",user.id);
   const results=await Promise.all([p,sb.from("hotel_attendance").select("*").order("check_in",{ascending:false}).limit(400),sb.from("hotel_advances").select("*").order("advance_date",{ascending:false}).limit(400),sb.from("hotel_days_off").select("*").order("leave_date",{ascending:false}).limit(400)]);
   const problem=results.find(x=>x.error)?.error;
   if(problem)throw Error(problem.message);
   setProfile(me as Profile);setUsers(results[0].data as Profile[]||[]);
   setShifts(results[1].data as Shift[]||[]);setAdvances(results[2].data as Advance[]||[]);setDaysOff(results[3].data as DayOff[]||[]);
   setLoading(false);
 }
 useEffect(()=>{
   setSetup(new URLSearchParams(window.location.search).get("kurulum")==="1");
   refresh().catch(e=>{handleError(e);setLoading(false)});
   const {data}=sb.auth.onAuthStateChange((event)=>{if(event==="SIGNED_OUT"){setProfile(null)}});
   return()=>data.subscription.unsubscribe();
 },[]);
 async function doTask(fn:()=>Promise<unknown>,ok="Kaydedildi."){
   setBusy(true);tell("");
   try{await fn();await refresh();setEditShift(null);setEditAdvance(null);setEditDay(null);tell(ok)}
   catch(e){handleError(e)}finally{setBusy(false)}
 }
 async function login(e:FormEvent<HTMLFormElement>){
   e.preventDefault();const d=values(e);
   await doTask(async()=>{const {error}=await sb.auth.signInWithPassword({email:email(d.username),password:d.password});if(error)throw Error("Kullanıcı adı veya şifre hatalı.");},"Giriş başarılı.");
 }
 async function bootstrap(e:FormEvent<HTMLFormElement>){
   e.preventDefault();const d=values(e);
   setBusy(true);tell("");
   try{await api({action:"bootstrap",...d});setSetup(false);window.history.replaceState({},'','/');tell("Yönetici hesabı oluşturuldu. Artık giriş yapabilirsiniz.")}
   catch(err){handleError(err)}finally{setBusy(false)}
 }
 async function logout(){await sb.auth.signOut();setProfile(null);tell("");setTab("mesai")}
 function chooseTab(t:Tab){setTab(t);setEditShift(null);setEditAdvance(null);setEditDay(null);tell("")}
 const staff=users.filter(p=>p.role==="staff");
 const label=(id:string)=>users.find(p=>p.id===id)?.full_name||"Personel";
 const options=staff.map(s=><option key={s.id} value={s.id}>{s.full_name} ({s.username})</option>);
 const ownOpen=shifts.find(s=>s.staff_id===profile?.id&&!s.check_out);
 const totalHours=shifts.filter(s=>s.staff_id===profile?.id&&s.check_out&&s.work_date.slice(0,7)===day().slice(0,7)).reduce((sum,s)=>sum+(new Date(s.check_out!).getTime()-new Date(s.check_in).getTime())/3600000,0);
 if(loading)return <div className="auth-wrap"><div className="auth-card"><div className="brandmark">BG</div><p className="sub">Uygulama açılıyor...</p></div></div>;
 if(!profile)return <main className="auth-wrap"><div className="auth-card"><div className="brandmark">BG</div><h1 className="brand">BAYRAK GRAND HOTEL</h1><p className="sub">{setup?"İlk Yönetici Hesabı":"Personel Takip Sistemi"}</p>
   {setup?<form onSubmit={bootstrap}>
     <label>Özel kurulum anahtarı<input name="key" type="password" autoComplete="off" required/></label>
     <label>Yönetici Ad Soyad<input name="full_name" required minLength={2} maxLength={100}/></label>
     <label>Yönetici Kullanıcı Adı<input name="username" required pattern="[a-z0-9._-]{3,30}" placeholder="yonetici"/></label>
     <label>Yeni Şifre<input name="password" type="password" autoComplete="new-password" required minLength={8}/></label>
     <button disabled={busy}>Yönetici Hesabını Oluştur</button><a href="/">Giriş ekranına dön</a>
   </form>:<form onSubmit={login}><label>Kullanıcı Adı<input name="username" autoComplete="username" required placeholder="Kullanıcı adınız"/></label><label>Şifre<input type="password" name="password" autoComplete="current-password" required placeholder="Şifreniz"/></label><button disabled={busy}>Giriş Yap</button></form>}
   {error&&<div className="error">{error}</div>}{success&&<div className="success">{success}</div>}
   <footer>TRABZON · Güvenli Personel Girişi</footer></div></main>;
 return <><header className="top"><strong>BAYRAK GRAND HOTEL</strong><button className="secondary" onClick={logout}>Çıkış Yap</button></header><main className="shell">
 <div className="welcome"><div><h1>Merhaba, {profile.full_name}</h1><p className="muted">{manager?"Yönetici Paneli":"Personel Paneli"}</p></div><button className="secondary" onClick={()=>doTask(refresh,"Kayıtlar yenilendi.")} disabled={busy}>Yenile</button></div>
 <div className="tabs">{(manager?[["personel","Personeller"],["mesai","Giriş / Çıkış"],["avans","Avanslar"],["izin","Haftalık İzinler"]]:[["mesai","Giriş / Çıkış"],["avans","Avanslarım"],["izin","İzinlerim"]]).map(([id,name])=><button key={id} className={tab===id?"active":""} onClick={()=>chooseTab(id as Tab)}>{name}</button>)}</div>
 {error&&<div className="error">{error}</div>}{success&&<div className="success">{success}</div>}
 {manager&&tab==="personel"&&<div className="grid"><section className="panel"><h2>Personel Ekle</h2><form onSubmit={e=>{e.preventDefault();const d=values(e);doTask(()=>api({action:"create_staff",...d}),"Personel hesabı oluşturuldu.")}}>
 <label>Ad Soyad<input name="full_name" required minLength={2}/></label><label>Kullanıcı Adı<input name="username" required pattern="[a-z0-9._-]{3,30}"/></label><label>Şifre (en az 8 karakter)<input name="password" type="password" minLength={8} required/></label><button disabled={busy}>Personeli Ekle</button></form></section>
 <section className="panel"><h2>Personel Listesi ({staff.length})</h2>{staff.length===0?<p className="muted">Henüz personel eklenmemiş.</p>:staff.map(s=><div className="row" key={s.id}><div><b>{s.full_name}</b><p className="muted">@{s.username} · {s.active?"Aktif":"Pasif"}</p></div><div className="actions">
 <button className="secondary" onClick={()=>{const name=prompt("Personelin adı soyadı:",s.full_name);if(name&&name.trim().length>=2)doTask(async()=>{const {error}=await sb.from("hotel_profiles").update({full_name:name.trim()}).eq("id",s.id);if(error)throw error})}}>Düzenle</button>
 <button className="secondary" onClick={()=>{const pass=prompt("Yeni şifre (en az 8 karakter):");if(pass)doTask(()=>api({action:"reset_password",id:s.id,password:pass}),"Şifre yenilendi.")}}>Şifre</button>
 <button className={s.active?"danger":"secondary"} onClick={()=>{if(confirm(s.active?"Personel hesabı pasife alınsın mı?":"Personel hesabı aktifleştirilsin mi?"))doTask(()=>api({action:"set_active",id:s.id,active:!s.active}))}}>{s.active?"Pasife Al":"Aktifleştir"}</button>
 </div></div>)}</section></div>}
 {tab==="mesai"&&<>{!manager&&<section className="panel"><h2>Mesai Giriş / Çıkış</h2><p className="muted">Bu ay toplam çalışma: {totalHours.toFixed(1)} saat</p><p className="hint">{ownOpen?"Açık mesainiz bulunuyor. Çıkış yapabilirsiniz.":"Aktif mesainiz bulunmuyor."}</p><div className="actions" style={{marginTop:15}}><button disabled={busy||!!ownOpen} onClick={()=>doTask(async()=>{const {error}=await sb.rpc("hotel_clock_in");if(error)throw error},"Giriş başarıyla kaydedildi ✓")}>Giriş Yap</button><button className="secondary" disabled={busy||!ownOpen} onClick={()=>doTask(async()=>{const {error}=await sb.rpc("hotel_clock_out");if(error)throw error},"Çıkış başarıyla kaydedildi ✓")}>Çıkış Yap</button></div></section>}
 {manager&&editShift&&<section className="panel"><h2>Mesai Düzenle</h2><p>{label(editShift.staff_id)}</p><form key={editShift.id} onSubmit={e=>{e.preventDefault();const d=values(e);doTask(async()=>{const a=new Date(d.check_in),b=d.check_out?new Date(d.check_out):null;if(Number.isNaN(a.getTime())||(b&&b<a))throw Error("Saatleri kontrol edin.");const {error}=await sb.from("hotel_attendance").update({check_in:a.toISOString(),check_out:b?.toISOString()||null,work_date:d.check_in.slice(0,10),edited_by:profile.id,updated_at:new Date().toISOString()}).eq("id",editShift.id);if(error)throw error})}}>
 <label>Giriş Saati<input name="check_in" type="datetime-local" defaultValue={localTime(editShift.check_in)} required/></label><label>Çıkış Saati<input name="check_out" type="datetime-local" defaultValue={localTime(editShift.check_out)}/></label><div className="actions"><button disabled={busy}>Kaydet</button><button type="button" className="secondary" onClick={()=>setEditShift(null)}>İptal</button></div></form></section>}
 <section className="panel"><h2>{manager?"Tüm Personel Mesaileri":"Mesai Kayıtlarım"}</h2><div className="table-wrap"><table><thead><tr>{manager&&<th>Personel</th>}<th>Giriş</th><th>Çıkış</th><th>Süre</th>{manager&&<th>İşlem</th>}</tr></thead><tbody>{shifts.map(s=><tr key={s.id}>{manager&&<td>{label(s.staff_id)}</td>}<td>{stamp(s.check_in)}</td><td>{stamp(s.check_out)}</td><td>{s.check_out?((new Date(s.check_out).getTime()-new Date(s.check_in).getTime())/3600000).toFixed(1)+" sa":"—"}</td>{manager&&<td><button className="secondary" onClick={()=>setEditShift(s)}>Düzenle</button></td>}</tr>)}</tbody></table></div>{shifts.length===0&&<p className="muted">Henüz kayıt bulunmuyor.</p>}</section></>}
 {tab==="avans"&&<>{manager&&<section className="panel"><h2>{editAdvance?"Avans Düzenle":"Avans Kaydet"}</h2><form key={editAdvance?.id||"new"} onSubmit={e=>{e.preventDefault();const d=values(e);doTask(async()=>{const obj={staff_id:d.staff_id,amount:Number(d.amount),advance_date:d.advance_date,note:d.note};const q=editAdvance?sb.from("hotel_advances").update(obj).eq("id",editAdvance.id):sb.from("hotel_advances").insert({...obj,created_by:profile.id});const {error}=await q;if(error)throw error})}}>
 <label>Personel<select name="staff_id" defaultValue={editAdvance?.staff_id||staff[0]?.id} required>{staff.map(s=><option key={s.id} value={s.id}>{s.full_name}</option>)}</select></label><label>Tutar (₺)<input name="amount" type="number" min="1" step="0.01" defaultValue={editAdvance?.amount||""} required/></label><label>Avans Tarihi<input name="advance_date" type="date" defaultValue={editAdvance?.advance_date||day()} required/></label><label>Açıklama<input name="note" maxLength={500} defaultValue={editAdvance?.note||""}/></label><div className="actions"><button disabled={busy||staff.length===0}>{editAdvance?"Değişiklikleri Kaydet":"Avans Ekle"}</button>{editAdvance&&<button type="button" className="secondary" onClick={()=>setEditAdvance(null)}>İptal</button>}</div></form></section>}
 <section className="panel"><h2>{manager?"Avans Kayıtları":"Aldığım Avanslar"}</h2>{advances.length?advances.map(a=><div className="row" key={a.id}><div><b>{tl(a.amount)}</b> · {a.advance_date}{manager&&<p>{label(a.staff_id)}</p>}<p className="muted">{a.note}</p></div>{manager&&<div className="actions"><button className="secondary" onClick={()=>setEditAdvance(a)}>Düzenle</button><button className="danger" onClick={()=>{if(confirm("Bu avans kaydı silinsin mi?"))doTask(async()=>{const {error}=await sb.from("hotel_advances").delete().eq("id",a.id);if(error)throw error})}}>Sil</button></div>}</div>):<p className="muted">Avans kaydı bulunmuyor.</p>}</section></>}
 {tab==="izin"&&<>{manager&&<section className="panel"><h2>{editDay?"İzin Düzenle":"Haftalık İzin Kaydet"}</h2><form key={editDay?.id||"new"} onSubmit={e=>{e.preventDefault();const d=values(e);doTask(async()=>{const obj={staff_id:d.staff_id,leave_date:d.leave_date,note:d.note};const q=editDay?sb.from("hotel_days_off").update(obj).eq("id",editDay.id):sb.from("hotel_days_off").insert({...obj,created_by:profile.id});const {error}=await q;if(error)throw error})}}>
 <label>Personel<select name="staff_id" defaultValue={editDay?.staff_id||staff[0]?.id} required>{options}</select></label><label>İzin Günü<input name="leave_date" type="date" defaultValue={editDay?.leave_date||day()} required/></label><label>Açıklama<input name="note" maxLength={500} defaultValue={editDay?.note||""}/></label><div className="actions"><button disabled={busy||staff.length===0}>{editDay?"Değişiklikleri Kaydet":"İzin Ekle"}</button>{editDay&&<button type="button" className="secondary" onClick={()=>setEditDay(null)}>İptal</button>}</div></form></section>}
 <section className="panel"><h2>{manager?"İzin Kayıtları":"Haftalık İzinlerim"}</h2>{daysOff.length?daysOff.map(d=><div className="row" key={d.id}><div><b>{d.leave_date}</b>{manager&&<p>{label(d.staff_id)}</p>}<p className="muted">{d.note}</p></div>{manager&&<div className="actions"><button className="secondary" onClick={()=>setEditDay(d)}>Düzenle</button><button className="danger" onClick={()=>{if(confirm("Bu izin kaydı silinsin mi?"))doTask(async()=>{const {error}=await sb.from("hotel_days_off").delete().eq("id",d.id);if(error)throw error})}}>Sil</button></div>}</div>):<p className="muted">İzin kaydı bulunmuyor.</p>}</section></>}
 <p className="foot">Bayrak Grand Hotel · Trabzon · Personel Takip Sistemi</p></main></>;
}
