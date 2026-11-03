"use client";
import {useEffect,useState} from "react";
import type {FormEvent} from "react";
import type {SupabaseClient} from "@supabase/supabase-js";

type Profile={id:string;username:string;full_name:string;active:boolean;phone?:string|null;contact_email?:string|null;employee_no?:string|null;date_of_birth?:string|null;hire_date?:string|null;work_schedule?:string|null;department?:string|null;job_title?:string|null;photo_path?:string|null};
type Shift={id:string;staff_id:string;work_date:string;check_in:string;check_out:string|null};
type Advance={id:string;staff_id:string;advance_date:string;amount:number;note:string|null};
type DayOff={id:string;staff_id:string;leave_date:string;note:string|null};
type Announcement={id:string;title:string;body:string;created_at:string};
type Read={announcement_id:string};
type LeaveRequest={id:string;leave_date:string;reason:string;status:string;created_at:string};
type Plan={id:string;work_date:string;planned_start:string;planned_end:string};
type Section="home"|"leave"|"announcements"|"account"|"settings"|"advances";
type Language="tr"|"en";
type Dictionary={ [key:string]:string };
const langText:Record<Language,Dictionary>={
 tr:{home:"Anasayfa",leave:"İzin Talebi",announcements:"Duyurular",account:"Hesabım",settings:"Ayarlar",advances:"Avanslarım",other:"Diğer",menu:"Menü",logout:"Oturumu Kapat",welcome:"Hoş geldiniz",entry:"Giriş Yap",exit:"Çıkış Yap",working:"Çalışma Durumu",open:"Giriş yapılmış, çıkış bekleniyor",closed:"Şu anda açık mesai yok",thisMonth:"Bu Ay Çalışma",hours:"saat",totalAdvances:"Bu Ay Avans",weekly:"Vardiya Planım",attendance:"Son Mesailer",date:"Tarih",status:"Durum",request:"Yeni İzin Talebi",requestDate:"İzin Tarihi",reason:"Açıklama",send:"Talebi Gönder",myRequests:"İzin Taleplerim",approved:"Onaylandı",pending:"Beklemede",rejected:"Reddedildi",dayOff:"İzin Günlerim",noRows:"Henüz kayıt bulunmuyor.",read:"Okundu İşaretle",new:"Yeni",profile:"Personel Bilgilerim",name:"Ad Soyad",phone:"Telefon",department:"Departman",job:"Görev",employeeNo:"Sicil No.",email:"E-posta",birth:"Doğum Tarihi",hire:"İşe Başlama",workSchedule:"Çalışma Saati",language:"Dil Seçimi",turkish:"Türkçe",english:"English",password:"Şifre Değiştir",oldPassword:"Mevcut Şifre",newPassword:"Yeni Şifre",confirmPassword:"Yeni Şifreyi Tekrarla",changePassword:"Şifreyi Güncelle",photo:"Profil Fotoğrafı",upload:"Fotoğrafı Kaydet",refresh:"Yenile",completed:"Tamamlandı",awaiting:"Çıkış Bekleniyor",loginTime:"Giriş",logoutTime:"Çıkış",worked:"Süre",requestSent:"İzin talebiniz yöneticiye gönderildi.",passwordSaved:"Şifreniz güncellendi.",photoSaved:"Fotoğrafınız güncellendi.",connectedWifi:"Mesai işlemleri yalnızca otel Wi-Fi ağından yapılabilir.",loading:"Yükleniyor...",guide:"Yardım: Sorun yaşarsanız Hadi Bey'e başvurabilirsiniz.",profileManager:"Bu bilgiler yönetici tarafından kaydedilir.",noLeave:"İzin planı bulunmuyor."},
 en:{home:"Home",leave:"Leave Request",announcements:"Announcements",account:"My Profile",settings:"Settings",advances:"My Advances",other:"Other",menu:"Menu",logout:"Sign Out",welcome:"Welcome",entry:"Clock In",exit:"Clock Out",working:"Attendance",open:"Clocked in; waiting for checkout",closed:"No active shift",thisMonth:"Hours This Month",hours:"hours",totalAdvances:"Advances This Month",weekly:"My Shift Plan",attendance:"Recent Attendance",date:"Date",status:"Status",request:"New Leave Request",requestDate:"Leave Date",reason:"Reason",send:"Submit Request",myRequests:"My Leave Requests",approved:"Approved",pending:"Pending",rejected:"Rejected",dayOff:"Approved Days Off",noRows:"No records yet.",read:"Mark as Read",new:"New",profile:"My Employee Details",name:"Full Name",phone:"Phone",department:"Department",job:"Position",employeeNo:"Employee No.",email:"Email",birth:"Date of Birth",hire:"Start Date",workSchedule:"Working Hours",language:"Language",turkish:"Türkçe",english:"English",password:"Change Password",oldPassword:"Current Password",newPassword:"New Password",confirmPassword:"Confirm Password",changePassword:"Update Password",photo:"Profile Photo",upload:"Save Photo",refresh:"Refresh",completed:"Completed",awaiting:"Awaiting checkout",loginTime:"In",logoutTime:"Out",worked:"Duration",requestSent:"Your leave request was submitted.",passwordSaved:"Password updated.",photoSaved:"Photo updated.",connectedWifi:"Clock-in and clock-out require the hotel's Wi-Fi network.",loading:"Loading...",guide:"Need help? Please speak to Hadi.",profileManager:"These details are maintained by your manager.",noLeave:"No scheduled days off."}
};
const dateTR=(d:string)=>d.slice(0,10).split("-").reverse().join(".");
const time=(d:string|null)=>d?new Intl.DateTimeFormat("tr-TR",{timeZone:"Europe/Istanbul",hour:"2-digit",minute:"2-digit"}).format(new Date(d)):"—";
const today=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Istanbul",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const toMoney=(v:number)=>v.toLocaleString("tr-TR",{style:"currency",currency:"TRY"});
export default function StaffPortal({sb,profile,shifts,advances,daysOff,announcements,reads,onRefresh,onRead,onLogout}:{
 sb:SupabaseClient;profile:Profile;shifts:Shift[];advances:Advance[];daysOff:DayOff[];announcements:Announcement[];reads:Read[];
 onRefresh:()=>Promise<void>;onRead:(id:string)=>Promise<void>;onLogout:()=>Promise<void>
}){
 const [section,setSection]=useState<Section>("home");
 const [menuOpen,setMenuOpen]=useState(false);
 const [lang,setLang]=useState<Language>("tr");
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[success,setSuccess]=useState("");
 const [requests,setRequests]=useState<LeaveRequest[]>([]);
 const [plans,setPlans]=useState<Plan[]>([]);
 const [photoUrl,setPhotoUrl]=useState(""),[photoFile,setPhotoFile]=useState<File|null>(null);
 const [reload,setReload]=useState(0);
 const t=langText[lang];
 const own=shifts.filter(s=>s.staff_id===profile.id);
 const openShift=own.find(s=>!s.check_out);
 const month=today().slice(0,7);
 const monthHours=own.filter(s=>s.work_date.startsWith(month)&&s.check_out).reduce((n,s)=>n+(new Date(s.check_out!).getTime()-new Date(s.check_in).getTime())/3600000,0);
 const monthAdvance=advances.filter(a=>a.staff_id===profile.id&&a.advance_date.startsWith(month)).reduce((n,a)=>n+Number(a.amount),0);
 const unread=announcements.filter(a=>!reads.some(r=>r.announcement_id===a.id)).length;
 useEffect(()=>{try{const saved=window.localStorage.getItem("bgh-language");if(saved==="tr"||saved==="en")setLang(saved)}catch{}},[]);
 useEffect(()=>{
  let active=true;
  async function load(){
   const res=await Promise.all([
    sb.from("hotel_leave_requests").select("id,leave_date,reason,status,created_at").eq("staff_id",profile.id).order("created_at",{ascending:false}).limit(100),
    sb.from("hotel_shift_plans").select("id,work_date,planned_start,planned_end").eq("staff_id",profile.id).gte("work_date",today()).order("work_date",{ascending:true}).limit(30)
   ]);
   if(!active)return;
   if(res[0].error)setError(res[0].error.message);else setRequests(res[0].data||[]);
   if(res[1].error)setError(res[1].error.message);else setPlans(res[1].data||[]);
  }
  void load();return()=>{active=false};
 },[sb,profile.id,reload]);
 useEffect(()=>{
  let active=true;
  async function photo(){
   if(!profile.photo_path){setPhotoUrl("");return}
   const {data}=await sb.storage.from("hotel-staff-photos").createSignedUrl(profile.photo_path,3600);
   if(active)setPhotoUrl(data?.signedUrl||"");
  }
  void photo();return()=>{active=false};
 },[sb,profile.photo_path,reload]);
 function go(v:Section){setSection(v);setMenuOpen(false);setError("");setSuccess("")}
 function message(err:unknown){setError(err instanceof Error?err.message:String(err));setSuccess("")}
 async function clock(action:"hotel_clock_in"|"hotel_clock_out"){
  setBusy(true);setError("");setSuccess("");
  try{const {error:e}=await sb.rpc(action);if(e)throw e;await onRefresh();setSuccess(lang==="tr"?"Mesai saati kaydedildi ✓":"Attendance recorded ✓")}
  catch(e){message(e)}finally{setBusy(false)}
 }
 async function requestLeave(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy(true);setError("");setSuccess("");
  const f=e.currentTarget;const d=new FormData(f);
  try{
   const {error:q}=await sb.from("hotel_leave_requests").insert({staff_id:profile.id,leave_date:String(d.get("leave_date")),reason:String(d.get("reason")).trim()});
   if(q)throw q;f.reset();setReload(v=>v+1);setSuccess(t.requestSent);
  }catch(x){message(x)}finally{setBusy(false)}
 }
 async function password(e:FormEvent<HTMLFormElement>){
  e.preventDefault();const f=e.currentTarget,d=new FormData(f);
  const old=String(d.get("old")||""),fresh=String(d.get("fresh")||""),confirm=String(d.get("confirm")||"");
  if(fresh.length<8||fresh!==confirm||fresh===old){setError(lang==="tr"?"Yeni şifre en az 8 karakter olmalı, eski şifreden farklı ve tekrar alanıyla aynı olmalıdır.":"New password must be at least 8 characters, different from current password and match confirmation.");return}
  setBusy(true);setError("");setSuccess("");
  try{
   const {error:verify}=await sb.auth.signInWithPassword({email:profile.username.toLowerCase()+"@personel.bayrak.example",password:old});
   if(verify)throw Error(lang==="tr"?"Mevcut şifre hatalı.":"Current password is incorrect.");
   const {error:update}=await sb.auth.updateUser({password:fresh});
   if(update)throw update;f.reset();setSuccess(t.passwordSaved);
  }catch(x){message(x)}finally{setBusy(false)}
 }
 async function upload(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(!photoFile)return;
  if(!["image/jpeg","image/png","image/webp"].includes(photoFile.type)||photoFile.size>2097152){setError(lang==="tr"?"JPG, PNG veya WEBP, en fazla 2 MB seçin.":"Choose JPG, PNG or WEBP under 2 MB.");return}
  setBusy(true);setError("");setSuccess("");
  try{
   const ext=photoFile.type==="image/png"?"png":photoFile.type==="image/webp"?"webp":"jpg";
   const path=profile.id+"/"+crypto.randomUUID()+"."+ext;
   const {error:up}=await sb.storage.from("hotel-staff-photos").upload(path,photoFile,{contentType:photoFile.type,upsert:false});if(up)throw up;
   const {error:save}=await sb.rpc("hotel_set_own_photo",{p_path:path});if(save)throw save;
   setPhotoFile(null);setReload(v=>v+1);await onRefresh();setSuccess(t.photoSaved);
  }catch(x){message(x)}finally{setBusy(false)}
 }
 function language(v:Language){setLang(v);try{window.localStorage.setItem("bgh-language",v)}catch{}}
 const items:{id:Section;icon:string}[]=[{id:"home",icon:"⌂"},{id:"leave",icon:"▦"},{id:"announcements",icon:"♢"},{id:"account",icon:"♙"},{id:"advances",icon:"₺"},{id:"settings",icon:"⚙"}];
 const menu=<>
  <div className="employee-menu-user">
   <div className="employee-avatar">{photoUrl?<img src={photoUrl} alt="" />:<span>{profile.full_name.slice(0,1).toUpperCase()}</span>}</div>
   <div><strong>{profile.full_name}</strong><small>{profile.phone||profile.username}</small><span>{profile.department||"Personel"}</span></div>
  </div>
  <div className="employee-nav-label">{t.menu}</div>
  <nav className="employee-nav" aria-label={t.menu}>
   {items.map(item=><button type="button" key={item.id} className={section===item.id?"employee-nav-item active":"employee-nav-item"} onClick={()=>go(item.id)}><span className="employee-nav-icon">{item.icon}</span>{t[item.id]}{item.id==="announcements"&&unread>0&&<b>{unread}</b>}</button>)}
  </nav>
  <div className="employee-menu-bottom"><button type="button" className="employee-logout" onClick={()=>void onLogout()}>{t.logout}</button></div>
 </>;
 return <div className="employee-app">
  <div className="employee-topbar">
   <button type="button" className="employee-hamburger" onClick={()=>setMenuOpen(v=>!v)} aria-label={t.menu}>☰</button>
   <strong>BAYRAK GRAND HOTEL</strong>
   <button type="button" className="employee-bell" onClick={()=>go("announcements")} aria-label={t.announcements}>♧{unread>0&&<sup>{unread}</sup>}</button>
  </div>
  {menuOpen&&<button type="button" className="employee-scrim" aria-label="Close menu" onClick={()=>setMenuOpen(false)} />}
  <aside className={"employee-drawer"+(menuOpen?" open":"")}>{menu}</aside>
  <main className="employee-main">
   <div className="employee-pagehead"><div><p>BAYRAK GRAND HOTEL • TRABZON</p><h1>{t[section]}</h1></div><button type="button" className="employee-refresh" onClick={()=>{void onRefresh();setReload(v=>v+1)}}>↻ {t.refresh}</button></div>
   {error&&<div className="employee-alert error" role="alert">{error}</div>}{success&&<div className="employee-alert success" role="status">{success}</div>}
   {section==="home"&&<>
    <div className="employee-hello"><p>{t.welcome},</p><h2>{profile.full_name} <span>✦</span></h2><small>{t.connectedWifi}</small></div>
    <div className="employee-metrics">
     <article><span>{t.working}</span><strong className={openShift?"employee-online":"employee-offline"}>{openShift?t.open:t.closed}</strong></article>
     <article><span>{t.thisMonth}</span><strong>{monthHours.toFixed(1)} {t.hours}</strong></article>
     <article><span>{t.totalAdvances}</span><strong>{toMoney(monthAdvance)}</strong></article>
    </div>
    <section className="employee-card employee-clock"><h3>{t.working}</h3><div className="employee-clock-actions"><button disabled={busy||!!openShift} onClick={()=>void clock("hotel_clock_in")} className="employee-clock-in">↪ {t.entry}</button><button disabled={busy||!openShift} onClick={()=>void clock("hotel_clock_out")} className="employee-clock-out">↩ {t.exit}</button></div></section>
    <section className="employee-card"><div className="employee-card-head"><h3>{t.weekly}</h3><button type="button" onClick={()=>go("leave")}>↗</button></div>{plans.length?plans.slice(0,7).map(p=><div className="employee-line" key={p.id}><span>{dateTR(p.work_date)}</span><b>{p.planned_start.slice(0,5)} – {p.planned_end.slice(0,5)}</b></div>):<p className="employee-empty">{t.noLeave}</p>}</section>
    <section className="employee-card"><h3>{t.attendance}</h3>{own.slice(0,7).map(s=><div className="employee-line" key={s.id}><span>{dateTR(s.work_date)}</span><b>{time(s.check_in)} – {time(s.check_out)}</b></div>)}{own.length===0&&<p className="employee-empty">{t.noRows}</p>}</section>
   </>}
   {section==="leave"&&<>
    <section className="employee-card"><h3>{t.request}</h3><form className="employee-form" onSubmit={requestLeave}><label>{t.requestDate}<input type="date" name="leave_date" min={today()} required/></label><label>{t.reason}<textarea name="reason" required minLength={3} maxLength={500} placeholder={t.reason}/></label><button disabled={busy}>{t.send}</button></form></section>
    <section className="employee-card"><h3>{t.myRequests}</h3>{requests.map(r=><div className="employee-line" key={r.id}><div><b>{dateTR(r.leave_date)}</b><p>{r.reason}</p></div><span className={"employee-state "+r.status}>{t[r.status]||r.status}</span></div>)}{requests.length===0&&<p className="employee-empty">{t.noRows}</p>}</section>
    <section className="employee-card"><h3>{t.dayOff}</h3>{daysOff.filter(d=>d.staff_id===profile.id).map(d=><div className="employee-line" key={d.id}><span>{dateTR(d.leave_date)}</span><b>{d.note||"✓"}</b></div>)}{daysOff.length===0&&<p className="employee-empty">{t.noRows}</p>}</section>
   </>}
   {section==="announcements"&&<section className="employee-card"><h3>{t.announcements}</h3>{announcements.map(a=>{const read=reads.some(r=>r.announcement_id===a.id);return <article className="employee-announcement" key={a.id}><div><strong>{a.title}</strong>{!read&&<span className="employee-new">{t.new}</span>}</div><small>{dateTR(a.created_at)}</small><p>{a.body}</p>{!read&&<button type="button" className="employee-small-button" onClick={()=>void onRead(a.id)}>{t.read}</button>}</article>})}{announcements.length===0&&<p className="employee-empty">{t.noRows}</p>}</section>}
   {section==="account"&&<section className="employee-card"><div className="employee-profile-head"><div className="employee-avatar large">{photoUrl?<img src={photoUrl} alt=""/>:profile.full_name[0]}</div><div><h3>{profile.full_name}</h3><p>@{profile.username}</p></div></div><h3>{t.profile}</h3>{([{label:"employeeNo",value:profile.employee_no},{label:"name",value:profile.full_name},{label:"phone",value:profile.phone},{label:"email",value:profile.contact_email},{label:"department",value:profile.department},{label:"job",value:profile.job_title},{label:"workSchedule",value:profile.work_schedule},{label:"birth",value:profile.date_of_birth?dateTR(profile.date_of_birth):null},{label:"hire",value:profile.hire_date?dateTR(profile.hire_date):null}] as const).map(x=><div className="employee-detail" key={x.label}><span>{t[x.label]}</span><b>{x.value||"—"}</b></div>)}<p className="employee-empty">{t.profileManager}</p></section>}
   {section==="advances"&&<section className="employee-card"><h3>{t.advances}</h3>{advances.filter(a=>a.staff_id===profile.id).map(a=><div className="employee-line" key={a.id}><span>{dateTR(a.advance_date)}<p>{a.note||""}</p></span><b>{toMoney(Number(a.amount))}</b></div>)}{advances.length===0&&<p className="employee-empty">{t.noRows}</p>}</section>}
   {section==="settings"&&<>
    <section className="employee-card"><h3>{t.language}</h3><div className="employee-lang"><button className={lang==="tr"?"active":""} onClick={()=>language("tr")}>Türkçe</button><button className={lang==="en"?"active":""} onClick={()=>language("en")}>English</button></div></section>
    <section className="employee-card"><h3>{t.photo}</h3><div className="employee-photo-row"><div className="employee-avatar large">{photoUrl?<img src={photoUrl} alt=""/>:profile.full_name[0]}</div><form className="employee-form" onSubmit={upload}><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setPhotoFile(e.target.files?.[0]||null)} required/><button disabled={!photoFile||busy}>{t.upload}</button></form></div></section>
    <section className="employee-card"><h3>{t.password}</h3><form className="employee-form" onSubmit={password}><label>{t.oldPassword}<input name="old" type="password" required autoComplete="current-password"/></label><label>{t.newPassword}<input name="fresh" type="password" minLength={8} required autoComplete="new-password"/></label><label>{t.confirmPassword}<input name="confirm" type="password" minLength={8} required autoComplete="new-password"/></label><button disabled={busy}>{t.changePassword}</button></form></section>
    <div className="employee-help">{t.guide}</div>
   </>}
  </main>
 </div>;
}
