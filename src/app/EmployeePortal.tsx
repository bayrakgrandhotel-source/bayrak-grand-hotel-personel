"use client";
import {useEffect,useState} from "react";
import type {FormEvent} from "react";
import type {SupabaseClient} from "@supabase/supabase-js";
import ThemeToggle from "./ThemeToggle";
type Staff={id:string;username:string;full_name:string;phone?:string|null;contact_email?:string|null;employee_no?:string|null;department?:string|null;job_title?:string|null;work_schedule?:string|null;hire_date?:string|null;photo_path?:string|null};
type Shift={id:string;work_date:string;check_in:string;check_out:string|null};
type Advance={id:string;advance_date:string;amount:number;note:string|null};
type DayOff={id:string;leave_date:string;note:string|null};
type Announcement={id:string;title:string;body:string;created_at:string};
type Read={announcement_id:string};
type Leave={id:string;leave_date:string;reason:string;status:string};
type Plan={id:string;work_date:string;planned_start:string;planned_end:string};
type Page="home"|"leave"|"news"|"account"|"settings";

function AccountIcon({size=21}:{size?:number}){
 return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
 <circle cx="12" cy="8" r="4"/>
 <path d="M4.5 21v-2a7.5 7.5 0 0 1 15 0v2"/>
 </svg>;
}

function BellIcon({size=21}:{size?:number}){
 return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/>
  <path d="M10 21h4"/>
 </svg>;
}

const day=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Istanbul",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const time=(v:string|null)=>v?new Date(v).toLocaleString("tr-TR",{timeZone:"Europe/Istanbul",dateStyle:"short",timeStyle:"short"}):"—";
const onlyClock=(v:string)=>new Date(v).toLocaleTimeString("tr-TR",{timeZone:"Europe/Istanbul",hour:"2-digit",minute:"2-digit",hour12:false});
export default function EmployeePortal({sb,profile,shifts,advances,daysOff,announcements,reads,onRefresh,onLogout}:{sb:SupabaseClient;profile:Staff;shifts:Shift[];advances:Advance[];daysOff:DayOff[];announcements:Announcement[];reads:Read[];onRefresh:()=>Promise<void>;onLogout:()=>Promise<void>}){
 const [page,setPage]=useState<Page>("home"),[drawer,setDrawer]=useState(false),[lang,setLang]=useState<"tr"|"en">("tr");
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[success,setSuccess]=useState("");
 const [leaveDate,setLeaveDate]=useState(day()),[leaveReason,setLeaveReason]=useState(""),[leaves,setLeaves]=useState<Leave[]>([]),[plans,setPlans]=useState<Plan[]>([]);
 const [readIds,setReadIds]=useState<string[]>([]),[photo,setPhoto]=useState<File|null>(null),[photoUrl,setPhotoUrl]=useState("");
 const [currentPassword,setCurrentPassword]=useState(""),[newPassword,setNewPassword]=useState(""),[confirmPassword,setConfirmPassword]=useState("");
 const en=lang==="en";
 const labels:{[key:string]:[string,string]}={home:["Anasayfa","Home"],leave:["İzin Talebi","Leave Request"],news:["Duyurular","Announcements"],account:["Hesabım","My Profile"],settings:["Ayarlar","Settings"],menu:["Menü","Menu"],other:["Diğer","Other"],logout:["Oturumu Kapat","Sign Out"],in:["Giriş Yap","Clock In"],out:["Çıkış Yap","Clock Out"],hours:["Aylık Çalışma","Monthly Hours"],advances:["Aylık Avans","Monthly Advances"],leaveDays:["İzin Günlerim","My Days Off"],record:["Mesai Kayıtlarım","Attendance Records"],shifts:["Vardiyalarım","My Shifts"],date:["Tarih","Date"],reason:["Açıklama","Reason"],send:["Talep Gönder","Submit Request"],requests:["Taleplerim","My Requests"],pending:["Beklemede","Pending"],approved:["Onaylandı","Approved"],rejected:["Reddedildi","Rejected"],password:["Şifre Değiştir","Change Password"],photo:["Profil Fotoğrafı","Profile Photo"],save:["Kaydet","Save"],language:["Dil Seçimi","Language"],refresh:["Yenile","Refresh"],read:["Okundu İşaretle","Mark Read"],guide:["Kullanım Kılavuzu","User Guide"]};
 const t=(name:string)=>labels[name]?.[en?1:0]||name;
 useEffect(()=>{try{setLang(localStorage.getItem("bgh-lang")==="en"?"en":"tr")}catch{}},[]);
 useEffect(()=>{setReadIds(reads.map(x=>x.announcement_id))},[reads]);
 useEffect(()=>{let alive=true;Promise.all([
 sb.from("hotel_leave_requests").select("id,leave_date,reason,status").eq("staff_id",profile.id).order("created_at",{ascending:false}).limit(100),
 sb.from("hotel_shift_plans").select("id,work_date,planned_start,planned_end").eq("staff_id",profile.id).gte("work_date",day()).order("work_date").limit(15)
 ]).then(r=>{if(!alive)return;const err=r.find(x=>x.error)?.error;if(err)throw err;setLeaves(r[0].data||[]);setPlans(r[1].data||[])}).catch(e=>{if(alive)setError(e.message)});return()=>{alive=false}},[sb,profile.id,success]);
 useEffect(()=>{let alive=true;setPhotoUrl("");if(!profile.photo_path)return;sb.storage.from("hotel-staff-photos").createSignedUrl(profile.photo_path,1800).then(({data})=>{if(alive&&data?.signedUrl)setPhotoUrl(data.signedUrl)});return()=>{alive=false}},[sb,profile.photo_path,success]);
 const selected=(p:Page)=>{setPage(p);setDrawer(false);setError("");setSuccess("")};
 const todayKey=day();
 const openShift=shifts.find(s=>!s.check_out && (new Date().getTime()-new Date(s.check_in).getTime())<24*60*60*1000);
 const todayOpenShift=shifts.find(s=>!s.check_out&&s.work_date===todayKey);
 const dailyShifts=Object.entries(shifts.reduce<Record<string,Shift[]>>((groups,s)=>{
  (groups[s.work_date]??=[]).push(s);return groups;
 },{})).sort(([a],[b])=>b.localeCompare(a));
 const unread=announcements.filter(a=>!readIds.includes(a.id)).length;
 const totalHours=shifts.filter(s=>s.work_date.startsWith(day().slice(0,7))&&s.check_out).reduce((n,s)=>n+(new Date(s.check_out!).getTime()-new Date(s.check_in).getTime())/3600000,0);
 const totalAdvance=advances.filter(a=>a.advance_date.startsWith(day().slice(0,7))).reduce((n,a)=>n+Number(a.amount),0);
 async function run(fn:()=>Promise<void>,ok:string){setBusy(true);setError("");setSuccess("");try{await fn();await onRefresh();setSuccess(ok)}catch(e){setError(e instanceof Error?e.message:"İşlem başarısız")}finally{setBusy(false)}}
 async function clock(action:"in"|"out"){await run(async()=>{const {error}=await sb.rpc(action==="in"?"hotel_clock_in":"hotel_clock_out");if(error)throw error},en?"Saved.":"İşlem kaydedildi ✓")}
 async function request(e:FormEvent<HTMLFormElement>){
 e.preventDefault();
 await run(async()=>{
  const {data,error}=await sb.from("hotel_leave_requests")
   .insert({staff_id:profile.id,leave_date:leaveDate,reason:leaveReason.trim()})
   .select("id").single();
  if(error)throw error;
  setLeaveReason("");
  // Saved attendance requests always succeed independently of optional email delivery.
  // The DB trigger has already created the manager's in-app notification.
  if(data?.id){
   try{
    const {data:{session}}=await sb.auth.getSession();
    if(session){
     await fetch("https://wksbzfrpyrjzopoxnajc.supabase.co/functions/v1/hotel-leave-notify",{
      method:"POST",
      headers:{"Authorization":"Bearer "+session.access_token,"Content-Type":"application/json"},
      body:JSON.stringify({leave_request_id:data.id})
     });
    }
   }catch(err){console.warn("Leave email delivery unavailable",err)}
  }
 },en?"Request sent.":"İzin talebi gönderildi.");
}
 async function mark(id:string){setBusy(true);try{const {error}=await sb.from("hotel_announcement_reads").upsert({announcement_id:id,staff_id:profile.id},{onConflict:"announcement_id,staff_id",ignoreDuplicates:true});if(error)throw error;setReadIds(v=>v.includes(id)?v:[...v,id])}catch(e){setError(e instanceof Error?e.message:"Hata")}finally{setBusy(false)}}
 async function pass(e:FormEvent<HTMLFormElement>){e.preventDefault();if(newPassword!==confirmPassword||newPassword.length<8){setError(en?"Passwords do not match.":"Yeni şifreler eşleşmiyor veya çok kısa.");return}await run(async()=>{const {error}=await sb.auth.signInWithPassword({email:profile.username.toLowerCase()+"@personel.bayrak.example",password:currentPassword});if(error)throw Error(en?"Incorrect current password.":"Mevcut şifre yanlış.");const result=await sb.auth.updateUser({password:newPassword});if(result.error)throw result.error;setCurrentPassword("");setNewPassword("");setConfirmPassword("")},en?"Password changed.":"Şifre değiştirildi.")}
 async function upload(e:FormEvent<HTMLFormElement>){e.preventDefault();if(!photo)return;await run(async()=>{if(photo.size>2097152||!["image/png","image/jpeg","image/webp"].includes(photo.type))throw Error("JPG/PNG/WEBP · Max 2MB");const ext=photo.type==="image/png"?"png":photo.type==="image/webp"?"webp":"jpg";const path=profile.id+"/"+crypto.randomUUID()+"."+ext;const {error}=await sb.storage.from("hotel-staff-photos").upload(path,photo,{contentType:photo.type});if(error)throw error;const result=await sb.rpc("hotel_set_own_photo",{p_path:path});if(result.error)throw result.error;setPhoto(null)},en?"Photo updated.":"Fotoğraf kaydedildi.")}
 const items:{id:Page;icon:string}[]=[{id:"home",icon:"⌂"},{id:"leave",icon:"▦"},{id:"news",icon:"bell"},{id:"account",icon:"account"},{id:"settings",icon:"⚙"}];
 return <div className="emp-app">
 <header className="emp-top"><button className="emp-top-menu" aria-label={t("menu")} onClick={()=>setDrawer(true)}>☰</button><span className="emp-top-brand"><img src="/bayrak-logo-new.png?v=20261105-logo2" alt="" aria-hidden="true"/><strong>BAYRAK GRAND HOTEL</strong></span><button className="emp-top-bell" onClick={()=>selected("news")} aria-label={t("news")}><BellIcon size={22}/>{unread>0&&<small>{unread}</small>}</button></header>
 {drawer&&<button className="emp-overlay" onClick={()=>setDrawer(false)} aria-label="Close menu"/>}
 <aside className={"emp-drawer "+(drawer?"visible":"")}><div className="emp-id"><div className="emp-avatar">{photoUrl?<img src={photoUrl} alt=""/>:profile.full_name.charAt(0)}</div><div><b>{profile.full_name}</b><small>{profile.phone||profile.username}</small><span>{profile.job_title||profile.department||(en?"Staff":"Personel")}</span></div></div><p>{t("menu")}</p><nav>{items.map(i=><button key={i.id} className={page===i.id?"chosen":""} onClick={()=>selected(i.id)}><span className="emp-nav-symbol">{i.id==="news"?<BellIcon size={21}/>:i.id==="account"?<AccountIcon size={21}/>:i.icon}</span>{t(i.id)}{i.id==="news"&&unread>0&&<em>{unread}</em>}</button>)}</nav><p>{t("other")}</p><button onClick={()=>alert(en?"Use the menu to manage shifts, leave, announcements and settings.":"Mesai giriş ve çıkışı otelin Wi-Fi ağı üzerinden yapılır. İzin talepleri yöneticiye gönderilir. Şifre ve fotoğraf Ayarlar bölümündedir.")}>? {t("guide")}</button><button className="emp-logout" onClick={()=>void onLogout()}>{t("logout")}</button></aside>
 <main className="emp-main"><div className="emp-intro"><div><small>BAYRAK GRAND HOTEL · TRABZON</small><h1>{t(page)}</h1><p>{profile.full_name}</p></div><button onClick={()=>void onRefresh()} disabled={busy}>↻ {t("refresh")}</button></div>
 {error&&<div className="emp-error">{error}</div>}{success&&<div className="emp-success">{success}</div>}
 {page==="home"&&<><div className="emp-stats"><article><small>{t("hours")}</small><strong>{totalHours.toFixed(1)} {en?"hours":"saat"}</strong></article><article><small>{t("advances")}</small><strong>{totalAdvance.toLocaleString("tr-TR",{style:"currency",currency:"TRY"})}</strong></article><article><small>{t("leaveDays")}</small><strong>{daysOff.length}</strong></article><article><small>{t("news")}</small><strong>{unread}</strong></article></div>
 <section className="emp-paper"><h2>{en?"Clock In / Out":"Mesai Giriş / Çıkış"}</h2><p>{todayOpenShift?(en?"Today's shift is still open.":"Bugünkü mesainizin çıkışı bekleniyor."):openShift?(en?"An earlier shift is still open. You may clock out from that shift or clock in for today.":"Önceki günden açık mesainiz var. O mesainin çıkışını yapabilir veya bugün için yeni giriş oluşturabilirsiniz."):(en?"No active shift today.":"Bugün için aktif mesainiz yok.")}</p><div className="emp-clock"><button disabled={busy||!!todayOpenShift} onClick={()=>void clock("in")}>{t("in")}</button><button disabled={busy||!openShift} onClick={()=>void clock("out")}>{t("out")}</button></div><small>{en?"Clock in/out only on hotel Wi-Fi.":"Giriş ve çıkış yalnızca otelin Wi-Fi ağı üzerinden yapılabilir."}</small></section>
 <section className="emp-paper"><h2>{t("record")}</h2>
 <div className="emp-day-list">{dailyShifts.map(([workDate,logs])=>
  <div key={workDate} className="emp-day-card">
   <div className="emp-day-heading"><strong>{workDate.split("-").reverse().join(".")}</strong><span>{workDate===todayKey?(en?"Today":"Bugün"):""}</span></div>
   {logs.map(s=><div className="emp-day-hours" key={s.id}>
    <div><span>{en?"Clock In":"Giriş Saati"}</span><b>{onlyClock(s.check_in)}</b></div>
    <div><span>{en?"Clock Out":"Çıkış Saati"}</span>
      {s.check_out?<b>{onlyClock(s.check_out)}</b>:<b className={workDate<todayKey?"emp-missing-exit":"emp-pending-exit"}>{workDate<todayKey?(en?"Not clocked out":"Çıkış yapılmadı"):(en?"Awaiting clock out":"Çıkış bekleniyor")}</b>}
    </div>
   </div>)}
  </div>
 )}</div>
 {shifts.length===0&&<p>{en?"No attendance records yet.":"Henüz mesai kaydı bulunmuyor."}</p>}
 </section><section className="emp-paper"><h2>{t("shifts")}</h2>{plans.map(p=><div className="emp-line" key={p.id}><span>{p.work_date.split("-").reverse().join(".")}</span><b>{p.planned_start.slice(0,5)}–{p.planned_end.slice(0,5)}</b></div>)}{plans.length===0&&<p>—</p>}</section></>}
 {page==="leave"&&<><section className="emp-paper"><h2>{t("leave")}</h2><form onSubmit={request}><label>{t("date")}<input type="date" required min={day()} value={leaveDate} onChange={e=>setLeaveDate(e.target.value)}/></label><label>{t("reason")}<textarea minLength={3} maxLength={500} required rows={3} value={leaveReason} onChange={e=>setLeaveReason(e.target.value)}/></label><button disabled={busy}>{t("send")}</button></form></section><section className="emp-paper"><h2>{t("requests")}</h2>{leaves.map(l=><div className="emp-line" key={l.id}><span>{l.leave_date} — {l.reason}</span><b>{t(l.status)}</b></div>)}{leaves.length===0&&<p>—</p>}</section><section className="emp-paper"><h2>{t("leaveDays")}</h2>{daysOff.map(d=><div className="emp-line" key={d.id}><span>{d.leave_date}</span><b>{d.note||"—"}</b></div>)}{daysOff.length===0&&<p>—</p>}</section></>}
 {page==="news"&&<section className="emp-paper"><h2>{t("news")}</h2>{announcements.map(a=><article className="emp-news" key={a.id}><b>{a.title}</b><small>{time(a.created_at)}</small><p>{a.body}</p>{!readIds.includes(a.id)&&<button onClick={()=>void mark(a.id)} disabled={busy}>{t("read")}</button>}</article>)}{announcements.length===0&&<p>—</p>}</section>}
 {page==="account"&&<section className="emp-paper"><h2>{t("account")}</h2><div className="emp-id"><div className="emp-avatar">{photoUrl?<img src={photoUrl} alt=""/>:profile.full_name.charAt(0)}</div><b>{profile.full_name}</b></div>{([[en?"Name":"Ad Soyad",profile.full_name],[en?"Phone":"Telefon",profile.phone],[en?"Email":"E-posta",profile.contact_email],[en?"Employee No":"Sicil No",profile.employee_no],[en?"Department":"Departman",profile.department],[en?"Position":"Görev",profile.job_title],[en?"Working Hours":"Çalışma Saati",profile.work_schedule],[en?"Start Date":"İşe Başlama",profile.hire_date]] as [string,string|null|undefined][]).map(([k,v])=><div className="emp-line" key={k}><span>{k}</span><b>{v||"—"}</b></div>)}<p>{en?"Information is managed by your hotel manager.":"Hesap bilgilerinizi yönetici düzenler."}</p></section>}
 {page==="settings"&&<><section className="emp-paper"><ThemeToggle english={en}/></section><section className="emp-paper"><h2>{t("language")}</h2><select value={lang} onChange={e=>{const v=e.target.value==="en"?"en":"tr";setLang(v);localStorage.setItem("bgh-lang",v)}}><option value="tr">Türkçe</option><option value="en">English</option></select></section><section className="emp-paper"><h2>{t("password")}</h2><form onSubmit={pass}><label>{en?"Current password":"Mevcut Şifre"}<input required type="password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)}/></label><label>{en?"New password":"Yeni Şifre"}<input required minLength={8} type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)}/></label><label>{en?"Confirm":"Yeni Şifre Tekrar"}<input required minLength={8} type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)}/></label><button disabled={busy}>{t("password")}</button></form></section><section className="emp-paper"><h2>{t("photo")}</h2>{photoUrl&&<img className="emp-preview" src={photoUrl} alt=""/>}<form onSubmit={upload}><input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>setPhoto(e.target.files?.[0]||null)}/><small>JPG/PNG/WEBP, max 2 MB</small><button disabled={busy||!photo}>{t("save")}</button></form></section></>}
 </main></div>;
}
