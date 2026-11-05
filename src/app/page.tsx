"use client";
import {createClient} from "@supabase/supabase-js";
import {useEffect,useRef,useState} from "react";
import type {FormEvent} from "react";
import ReportsPanel from "./ReportsPanel";
import StaffManagement from "./StaffManagement";
import CompanySettings from "./CompanySettings";
import EmployeePortal from "./EmployeePortal";
import ManagerLeaveRequests from "./ManagerLeaveRequests";
import ThemeToggle from "./ThemeToggle";

function ManagerMenuIcon({kind,size=20}:{kind:"users"|"bell";size?:number}){
 return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
 {kind==="users"?<>
 <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
 <circle cx="9" cy="7" r="4"/>
 <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
 </>:<>
 <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/>
 <path d="M10 21h4"/>
 </>}
 </svg>;
}

const SB_URL="https://wksbzfrpyrjzopoxnajc.supabase.co";
const SB_KEY="sb_publishable_pzEUUtm95mpq3vynU2rVWQ_Z_82dfjl";
const sb=createClient(SB_URL,SB_KEY,{auth:{persistSession:true,autoRefreshToken:true}});
const email=(s:string)=>s.trim().toLowerCase()+"@personel.bayrak.example";
type Profile={id:string;username:string;full_name:string;login_email:string;role:"manager"|"staff";active:boolean;contact_email?:string|null};
type Shift={id:string;staff_id:string;work_date:string;check_in:string;check_out:string|null};
type Advance={id:string;staff_id:string;advance_date:string;amount:number;note:string|null};
type DayOff={id:string;staff_id:string;leave_date:string;note:string|null};
type HotelWifi={id:string;ip:string;created_at:string};
type Announcement={id:string;title:string;body:string;created_at:string;created_by:string};
type AnnouncementRead={announcement_id:string;staff_id:string;read_at:string};
type ManagerLeaveNotification={id:string;leave_request_id:string;staff_id:string;title:string;message:string;created_at:string;read_at:string|null;email_sent_at:string|null};
type WhatsappSettings={manager_id:string;boss_phone:string|null;boss_consent:boolean;boss_clock_in_enabled:boolean;staff_clock_in_enabled:boolean;staff_clock_out_enabled:boolean};
type Tab="genel"|"personel"|"mesai"|"avans"|"izin"|"aylik"|"duyurular"|"raporlar"|"ayarlar";
const day=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Istanbul",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const stamp=(value:string|null)=>value?new Date(value).toLocaleString("tr-TR",{timeZone:"Europe/Istanbul",dateStyle:"short",timeStyle:"short"}):"—";
const tl=(v:number)=>Number(v||0).toLocaleString("tr-TR",{style:"currency",currency:"TRY"});
const localTime=(s:string|null)=>s?new Date(new Date(s).getTime()-new Date(s).getTimezoneOffset()*60000).toISOString().slice(0,16):"";
const values=(e:FormEvent<HTMLFormElement>)=>Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string,string>;

export default function Home(){
 const [profile,setProfile]=useState<Profile|null>(null);
 const sessionRole=useRef<"manager"|"staff"|null>(null);
 const [users,setUsers]=useState<Profile[]>([]);
 const [shifts,setShifts]=useState<Shift[]>([]);
 const [advances,setAdvances]=useState<Advance[]>([]);
 const [daysOff,setDaysOff]=useState<DayOff[]>([]);
 const [wifiNetworks,setWifiNetworks]=useState<HotelWifi[]>([]);
 const [announcements,setAnnouncements]=useState<Announcement[]>([]);
 const [announcementReads,setAnnouncementReads]=useState<AnnouncementRead[]>([]);
 const [sendingAnnouncement,setSendingAnnouncement]=useState(false);
 const [leaveNotices,setLeaveNotices]=useState<ManagerLeaveNotification[]>([]);
 const [emailSaving,setEmailSaving]=useState(false);
 const [whatsappSaving,setWhatsappSaving]=useState(false);
 const [whatsappSettings,setWhatsappSettings]=useState<WhatsappSettings|null>(null);
 const [whatsappBossPhone,setWhatsappBossPhone]=useState("");
 const [whatsappBossConsent,setWhatsappBossConsent]=useState(false);
 const [whatsappBossIn,setWhatsappBossIn]=useState(true);
 const [whatsappStaffIn,setWhatsappStaffIn]=useState(true);
 const [whatsappStaffOut,setWhatsappStaffOut]=useState(true);
 const [tab,setTab]=useState<Tab>("mesai");
 const [monthlyMonth,setMonthlyMonth]=useState(day().slice(0,7));
 const [monthlyStaff,setMonthlyStaff]=useState("");
 const [monthlyShifts,setMonthlyShifts]=useState<Shift[]>([]);
 const [monthlyAdvances,setMonthlyAdvances]=useState<Advance[]>([]);
 const [monthlyDaysOff,setMonthlyDaysOff]=useState<DayOff[]>([]);
 const [monthlyLoading,setMonthlyLoading]=useState(false);
 const [monthlyExporting,setMonthlyExporting]=useState(false);
 const [monthlyError,setMonthlyError]=useState("");
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
 async function refresh(isInitialLoad=false){
   const {data:{user},error:authError}=await sb.auth.getUser();
   if(authError||!user){sessionRole.current=null;setProfile(null);setLoading(false);return}
   const {data:me,error:pErr}=await sb.from("hotel_profiles").select("*").eq("id",user.id).maybeSingle();
   if(pErr||!me||!me.active){await sb.auth.signOut({scope:"local"});sessionRole.current=null;setProfile(null);setLoading(false);tell("Hesap bulunamadı veya pasif durumda.",true);return}
   // Staff are never restored from a previous page load. Managers may keep their sessions.
   if(isInitialLoad&&me.role!=="manager"){await sb.auth.signOut({scope:"local"});sessionRole.current=null;setProfile(null);setLoading(false);return}
   sessionRole.current=me.role;
   const isManager=me.role==="manager";
   const p=isManager?sb.from("hotel_profiles").select("*"):sb.from("hotel_profiles").select("*").eq("id",user.id);
   const results=await Promise.all([p,sb.from("hotel_attendance").select("*").order("check_in",{ascending:false}).limit(400),sb.from("hotel_advances").select("*").order("advance_date",{ascending:false}).limit(400),sb.from("hotel_days_off").select("*").order("leave_date",{ascending:false}).limit(400),sb.from("hotel_announcements").select("*").order("created_at",{ascending:false}).limit(100),sb.from("hotel_announcement_reads").select("announcement_id,staff_id,read_at").eq("staff_id",user.id).limit(200)]);
   const problem=results.find(x=>x.error)?.error;
   if(problem)throw Error(problem.message);
   if(isManager){const {data:wifi,error:wifiErr}=await sb.from("hotel_wifi_networks").select("id,ip,created_at").order("created_at",{ascending:false});if(wifiErr)throw wifiErr;setWifiNetworks(wifi as HotelWifi[]||[])}else setWifiNetworks([]);
   if(!profile&&isManager)setTab("genel");
   setProfile(me as Profile);setUsers(results[0].data as Profile[]||[]);
   setShifts(results[1].data as Shift[]||[]);setAdvances(results[2].data as Advance[]||[]);setDaysOff(results[3].data as DayOff[]||[]);setAnnouncements(results[4].data as Announcement[]||[]);setAnnouncementReads(results[5].data as AnnouncementRead[]||[]);
   setLoading(false);
 }
 useEffect(()=>{
  if(profile?.role!=="manager"){setWhatsappSettings(null);return;}
  let live=true;
  sb.from("hotel_whatsapp_manager_settings").select("manager_id,boss_phone,boss_consent,boss_clock_in_enabled,staff_clock_in_enabled,staff_clock_out_enabled")
  .eq("manager_id",profile.id).maybeSingle().then(({data,error})=>{
   if(!live||error)return;
   const setting=(data as WhatsappSettings|null);
   setWhatsappSettings(setting);
   if(setting){
    setWhatsappBossPhone(setting.boss_phone||"");
    setWhatsappBossConsent(setting.boss_consent);
    setWhatsappBossIn(setting.boss_clock_in_enabled);
    setWhatsappStaffIn(setting.staff_clock_in_enabled);
    setWhatsappStaffOut(setting.staff_clock_out_enabled);
   }
  });
  return()=>{live=false};
 },[profile?.id,profile?.role]);
 useEffect(()=>{
   if(profile?.role!=="manager"){setLeaveNotices([]);return;}
   let mounted=true;
   const load=async()=>{
     if(document.visibilityState==="hidden")return;
     const {data,error}=await sb.from("hotel_manager_notifications")
       .select("id,leave_request_id,staff_id,title,message,created_at,read_at,email_sent_at")
       .eq("manager_id",profile.id)
       .order("created_at",{ascending:false}).limit(120);
     if(!error&&mounted)setLeaveNotices(data as ManagerLeaveNotification[]||[]);
   };
   void load();
   const timer=window.setInterval(()=>{void load()},20000);
   const foreground=()=>{if(document.visibilityState==="visible")void load()};
   document.addEventListener("visibilitychange",foreground);
   return()=>{mounted=false;window.clearInterval(timer);document.removeEventListener("visibilitychange",foreground)};
 },[profile?.id,profile?.role]);
 useEffect(()=>{
   setSetup(new URLSearchParams(window.location.search).get("kurulum")==="1");
   refresh(true).catch(e=>{handleError(e);setLoading(false)});
   const {data}=sb.auth.onAuthStateChange((event)=>{if(event==="SIGNED_OUT"){sessionRole.current=null;setProfile(null)}});
   // Only staff are signed out when closing or backgrounding the app.
   // Managers remain signed in until they explicitly choose "Çıkış Yap".
   const logoutStaffOnExit=()=>{if(sessionRole.current==="staff")void sb.auth.signOut({scope:"local"}).catch(()=>{})};
   const logoutWhenHidden=()=>{if(document.visibilityState==="hidden")logoutStaffOnExit()};
   const logoutWhenLeaving=()=>logoutStaffOnExit();
   document.addEventListener("visibilitychange",logoutWhenHidden);
   window.addEventListener("pagehide",logoutWhenLeaving);
   return()=>{data.subscription.unsubscribe();document.removeEventListener("visibilitychange",logoutWhenHidden);window.removeEventListener("pagehide",logoutWhenLeaving)};
 },[]);
 useEffect(()=>{
   if(tab!=="aylik"||profile?.role!=="manager")return;
   const id=monthlyStaff||users.find(u=>u.role==="staff")?.id||"";
   if(!id){setMonthlyShifts([]);setMonthlyAdvances([]);setMonthlyDaysOff([]);return;}
   if(!/^\d{4}-\d{2}$/.test(monthlyMonth)){setMonthlyError("Lütfen geçerli bir ay seçin.");return;}
   const first=monthlyMonth+"-01";
   const d=new Date(first+"T12:00:00Z");d.setUTCMonth(d.getUTCMonth()+1);
   const next=d.toISOString().slice(0,10);
   let alive=true;
   setMonthlyLoading(true);setMonthlyError("");
   Promise.all([
     sb.from("hotel_attendance").select("*").eq("staff_id",id).gte("work_date",first).lt("work_date",next).order("check_in",{ascending:true}).limit(1000),
     sb.from("hotel_advances").select("*").eq("staff_id",id).gte("advance_date",first).lt("advance_date",next).order("advance_date",{ascending:true}).limit(1000),
     sb.from("hotel_days_off").select("*").eq("staff_id",id).gte("leave_date",first).lt("leave_date",next).order("leave_date",{ascending:true}).limit(1000)
   ]).then(results=>{
     if(!alive)return;
     const fail=results.find(r=>r.error)?.error;
     if(fail)throw Error(fail.message);
     setMonthlyShifts(results[0].data as Shift[]||[]);
     setMonthlyAdvances(results[1].data as Advance[]||[]);
     setMonthlyDaysOff(results[2].data as DayOff[]||[]);
   }).catch(err=>{if(alive){setMonthlyError(err instanceof Error?err.message:"Aylık bilgiler yüklenemedi.");setMonthlyShifts([]);setMonthlyAdvances([]);setMonthlyDaysOff([])}}).finally(()=>{if(alive)setMonthlyLoading(false)});
   return()=>{alive=false};
 },[tab,profile?.role,monthlyMonth,monthlyStaff,users]);
 async function exportMonthly(){
   const selected=monthlyStaff||users.find(u=>u.role==="staff")?.id||"";
   const selectedName=users.find(u=>u.id===selected)?.full_name||"Personel";
   if(!selected||monthlyLoading||monthlyError)return;
   setMonthlyExporting(true);
   try{const {downloadMonthlyExcel}=await import("../lib/monthly-excel");await downloadMonthlyExcel({name:selectedName,month:monthlyMonth,shifts:monthlyShifts,advances:monthlyAdvances,daysOff:monthlyDaysOff});tell("Excel dosyası indirildi.");}
   catch(e){handleError(e)}finally{setMonthlyExporting(false)}
 }
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

 async function sendAnnouncement(e:FormEvent<HTMLFormElement>){
   e.preventDefault();
   if(profile?.role!=="manager")return;
   const form=e.currentTarget;
   const d=values(e);
   const title=String(d.title||"").trim(),body=String(d.body||"").trim();
   if(title.length<3||title.length>120||body.length<2||body.length>3000){tell("Duyuru başlığını ve mesajını kontrol edin.",true);return}
   setSendingAnnouncement(true);tell("");
   try{
     const {error}=await sb.from("hotel_announcements").insert({title,body,created_by:profile.id});
     if(error)throw error;form.reset();
     await refresh();tell("Genel duyuru tüm personellerin uygulamasına gönderildi.");
   }catch(err){handleError(err)}finally{setSendingAnnouncement(false)}
 }
 async function markAnnouncementRead(id:string){
   if(!profile)return;
   if(announcementReads.some(r=>r.announcement_id===id))return;
   try{
     const {error}=await sb.from("hotel_announcement_reads").upsert({announcement_id:id,staff_id:profile.id},{onConflict:"announcement_id,staff_id",ignoreDuplicates:true});
     if(error)throw error;
     setAnnouncementReads(prev=>[...prev,{announcement_id:id,staff_id:profile.id,read_at:new Date().toISOString()}]);
   }catch(err){handleError(err)}
 }
 async function deleteAnnouncement(id:string){
   if(profile?.role!=="manager")return;
   if(!confirm("Bu genel duyuru tüm personellerin ekranından silinsin mi?"))return;
   await doTask(async()=>{const {data,error}=await sb.from("hotel_announcements").delete().eq("id",id).select("id");if(error)throw error;if(!data?.length)throw Error("Duyuru silinemedi.")},"Duyuru silindi.");
 }
 async function markLeaveNotice(id:string){
  if(profile?.role!=="manager")return;
  const {error}=await sb.from("hotel_manager_notifications").update({read_at:new Date().toISOString()})
   .eq("id",id).eq("manager_id",profile.id).is("read_at",null);
  if(error){handleError(error);return}
  setLeaveNotices(current=>current.map(n=>n.id===id?{...n,read_at:new Date().toISOString()}:n));
 }
 async function saveManagerEmail(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(profile?.role!=="manager")return;
  setEmailSaving(true);tell("");
  try{
   const raw=String(values(e).notify_email||"").trim();
   const {error}=await sb.rpc("hotel_set_manager_notification_email",{p_email:raw});
   if(error)throw error;
   setProfile(p=>p?{...p,contact_email:raw||null}:p);
   tell(raw?"Bildirim e-posta adresi kaydedildi. E-posta gönderim hizmetinin ayrıca yapılandırılması gerekir.":"Bildirim e-posta adresi kaldırıldı.");
  }catch(err){handleError(err)}finally{setEmailSaving(false)}
 }
 async function saveWhatsappSettings(e:FormEvent<HTMLFormElement>){
  e.preventDefault();
  if(profile?.role!=="manager")return;
  setWhatsappSaving(true);tell("");
  try{
   const {error}=await sb.rpc("hotel_save_whatsapp_manager_settings",{
    p_boss_phone:whatsappBossPhone,
    p_boss_consent:whatsappBossConsent,
    p_boss_clock_in_enabled:whatsappBossIn,
    p_staff_clock_in_enabled:whatsappStaffIn,
    p_staff_clock_out_enabled:whatsappStaffOut
   });
   if(error)throw error;
   const {data}=await sb.from("hotel_whatsapp_manager_settings").select("manager_id,boss_phone,boss_consent,boss_clock_in_enabled,staff_clock_in_enabled,staff_clock_out_enabled").eq("manager_id",profile.id).maybeSingle();
   if(!data)throw Error("Kayıt doğrulanamadı. Sayfayı yenileyip tekrar deneyin.");
   const s=data as WhatsappSettings;
   setWhatsappSettings(s);
   setWhatsappBossPhone(s.boss_phone||"");
   setWhatsappBossConsent(s.boss_consent);
   setWhatsappBossIn(s.boss_clock_in_enabled);
   setWhatsappStaffIn(s.staff_clock_in_enabled);
   setWhatsappStaffOut(s.staff_clock_out_enabled);
   tell("Tercihler veritabanına kaydedildi. WhatsApp mesajlarının gönderilmesi için ayrıca Meta bağlantısı gerekir.");
  }catch(err){handleError(err)}finally{setWhatsappSaving(false)}
 }
 async function logout(){await sb.auth.signOut();setProfile(null);setAnnouncements([]);setAnnouncementReads([]);setLeaveNotices([]);tell("");setTab("mesai")}
 function chooseTab(t:Tab){setTab(t);setEditShift(null);setEditAdvance(null);setEditDay(null);tell("")}
 const staff=users.filter(p=>p.role==="staff");
 const unreadAnnouncementCount=announcements.filter(a=>!announcementReads.some(r=>r.announcement_id===a.id)).length;
 const unreadLeaveNoticeCount=leaveNotices.filter(n=>!n.read_at).length;
 const label=(id:string)=>users.find(p=>p.id===id)?.full_name||"Personel";
 const options=staff.map(s=><option key={s.id} value={s.id}>{s.full_name} ({s.username})</option>);
 const ownOpen=shifts.find(s=>s.staff_id===profile?.id&&!s.check_out);
 const totalHours=shifts.filter(s=>s.staff_id===profile?.id&&s.check_out&&s.work_date.slice(0,7)===day().slice(0,7)).reduce((sum,s)=>sum+(new Date(s.check_out!).getTime()-new Date(s.check_in).getTime())/3600000,0);
 const monthlyTotal=monthlyAdvances.reduce((sum,a)=>sum+Number(a.amount),0);
 const monthlyHours=monthlyShifts.reduce((sum,s)=>sum+(s.check_out?Math.max(0,(new Date(s.check_out).getTime()-new Date(s.check_in).getTime())/3600000):0),0);
 const monthTitle=/^\d{4}-\d{2}$/.test(monthlyMonth)?new Intl.DateTimeFormat("tr-TR",{month:"long",year:"numeric",timeZone:"UTC"}).format(new Date(monthlyMonth+"-01T12:00:00Z")):monthlyMonth;
 const shiftsByDate=Object.entries(shifts.reduce<Record<string,Shift[]>>((groups,s)=>{(groups[s.work_date]??=[]).push(s);return groups;},{})).sort(([a],[b])=>b.localeCompare(a));
 const renderShiftTable=(records:Shift[])=><div className="table-wrap"><table><thead><tr>{manager&&<th>Personel</th>}<th>Giriş</th><th>Çıkış</th><th>Süre</th>{manager&&<th>İşlem</th>}</tr></thead><tbody>{records.map(s=><tr key={s.id}>{manager&&<td>{label(s.staff_id)}</td>}<td>{stamp(s.check_in)}</td><td>{stamp(s.check_out)}</td><td>{s.check_out?((new Date(s.check_out).getTime()-new Date(s.check_in).getTime())/3600000).toFixed(1)+" sa":"—"}</td>{manager&&<td><div className="actions"><button className="secondary" onClick={()=>setEditShift(s)}>Düzenle</button><button className="danger" disabled={busy} onClick={()=>{if(confirm(label(s.staff_id)+" adlı personelin "+stamp(s.check_in)+" tarihli mesai giriş ve çıkış kaydı tamamen silinsin mi? Bu işlem geri alınamaz."))doTask(async()=>{const {data,error}=await sb.from("hotel_attendance").delete().eq("id",s.id).select("id");if(error)throw error;if(!data||data.length!==1)throw Error("Kayıt silinemedi. Yönetici yetkinizi kontrol edin.")},"Mesai kaydı silindi.")}}>Sil</button></div></td>}</tr>)}</tbody></table></div>;
 if(loading)return <div className="auth-wrap"><div className="auth-card"><img src="/bayrak-logo-new.png?v=20261105-logo2" alt="Bayrak Grand Hotel logosu" className="hotel-logo hotel-logo-loading"/><p className="sub">Uygulama açılıyor...</p></div></div>;
 if(!profile)return <main className="auth-wrap"><div className="auth-card"><img src="/bayrak-logo-new.png?v=20261105-logo2" alt="Bayrak Grand Hotel logosu" className="hotel-logo"/><h1 className="brand">BAYRAK GRAND HOTEL</h1><p className="sub">{setup?"İlk Yönetici Hesabı":"Personel Takip Sistemi"}</p>
   {setup?<form onSubmit={bootstrap}>
     <label>Özel kurulum anahtarı<input name="key" type="password" autoComplete="off" required/></label>
     <label>Yönetici Ad Soyad<input name="full_name" required minLength={2} maxLength={100}/></label>
     <label>Yönetici Kullanıcı Adı<input name="username" required pattern="[a-z0-9._-]{3,30}" placeholder="yonetici"/></label>
     <label>Yeni Şifre<input name="password" type="password" autoComplete="new-password" required minLength={8}/></label>
     <button disabled={busy}>Yönetici Hesabını Oluştur</button><a href="/">Giriş ekranına dön</a>
   </form>:<form onSubmit={login}><label>Kullanıcı Adı<input name="username" autoComplete="username" required placeholder="Kullanıcı adınız"/></label><label>Şifre<input type="password" name="password" autoComplete="current-password" required placeholder="Şifreniz"/></label><button disabled={busy}>Giriş Yap</button></form>}
   {error&&<div className="error">{error}</div>}{success&&<div className="success">{success}</div>}
   <footer>TRABZON · Güvenli Personel Girişi</footer><ThemeToggle compact/></div></main>;
 if(!manager)return <EmployeePortal sb={sb} profile={profile} shifts={shifts} advances={advances} daysOff={daysOff} announcements={announcements} reads={announcementReads} onRefresh={async()=>{await refresh()}} onLogout={logout}/>;
 return <><header className="top"><span className="top-brand"><img src="/bayrak-logo-new.png?v=20261105-logo2" alt="Bayrak Grand Hotel logosu" className="hotel-logo-small"/><strong>BAYRAK GRAND HOTEL</strong></span><div className="top-actions"><button className="bell-button leave-bell-button" type="button"
 title={"İzin talepleri"+(unreadLeaveNoticeCount>0?" · "+unreadLeaveNoticeCount+" yeni":"")}
 aria-label={"İzin talepleri, "+unreadLeaveNoticeCount+" yeni bildirim"}
 onClick={()=>chooseTab("izin")}>
 <span aria-hidden="true">✉</span>
 {unreadLeaveNoticeCount>0&&<span className="bell-count">{unreadLeaveNoticeCount>99?"99+":unreadLeaveNoticeCount}</span>}
 </button><button className="bell-button" type="button" title="Bildirimler" aria-label={"Bildirimler, "+unreadAnnouncementCount+" okunmamış"} onClick={()=>chooseTab("duyurular")}><span aria-hidden="true"><ManagerMenuIcon kind="bell" size={21}/></span>{unreadAnnouncementCount>0&&<span className="bell-count">{unreadAnnouncementCount>99?"99+":unreadAnnouncementCount}</span>}</button><button className="secondary" onClick={logout}>Çıkış Yap</button></div></header>{manager&&<aside className="manager-sidebar"><div className="sidebar-brand"><img src="/bayrak-logo-new.png?v=20261105-logo2" alt="" /><strong>BAYRAK GRAND HOTEL</strong><small>Yönetici Paneli</small></div><nav aria-label="Yönetici menüsü">{([["genel","★","Genel Bakış"],["personel","users","Personeller"],["mesai","⇄","Giriş / Çıkış"],["avans","₺","Avanslar"],["izin","▦","İzinler"],["aylik","▤","Aylık İşlemler"],["raporlar","▥","Raporlar"],["duyurular","bell","Duyurular"],["ayarlar","⚙","Ayarlar"]] as const).map(([key,icon,title])=><button key={key} className={tab===key?"side-link selected":"side-link"} onClick={()=>chooseTab(key)}><span className="side-icon" aria-hidden="true">{key==="personel"?<ManagerMenuIcon kind="users"/>:key==="duyurular"?<ManagerMenuIcon kind="bell"/>:icon}</span>{title}{key==="izin"&&unreadLeaveNoticeCount>0&&<span className="leave-menu-count">{unreadLeaveNoticeCount}</span>}</button>)}</nav><div className="sidebar-theme"><ThemeToggle/></div><button className="sidebar-logout" onClick={logout}>Çıkış Yap</button></aside>}<main className={manager?"shell shell-manager":"shell"}>
 <div className="welcome"><div><h1>Merhaba, {profile.full_name}</h1><p className="muted">{manager?"Yönetici Paneli":"Personel Paneli"}</p></div><button className="secondary" onClick={()=>doTask(refresh,"Kayıtlar yenilendi.")} disabled={busy}>Yenile</button></div>
 {!manager&&<div className="tabs">{([["mesai","Giriş / Çıkış"],["avans","Avanslarım"],["izin","İzinlerim"],["duyurular","Bildirimler"]] as const).map(([id,name])=><button key={id} className={tab===id?"active":""} onClick={()=>chooseTab(id)}>{name}</button>)}</div>}
 {error&&<div className="error">{error}</div>}{success&&<div className="success">{success}</div>}
 {manager&&tab==="genel"&&<section className="overview-main">
 <div className="overview-heading"><h2>Genel Bakış</h2><p className="muted">Bayrak Grand Hotel · Personel Yönetimi</p></div>
 <div className="overview-cards">
 <button className="overview-card overview-card-arrivals" onClick={()=>chooseTab("mesai")}><span>Bugün Giriş Yapanlar</span><strong>{new Set(shifts.filter(s=>s.work_date===day()).map(s=>s.staff_id)).size}</strong><small>Bugün mesaiye başlayan personel</small></button>
 <button className="overview-card overview-card-missing" onClick={()=>chooseTab("mesai")}><span>Çıkış Yapmayanlar</span><strong>{shifts.filter(s=>!s.check_out).length}</strong><small>Açık mesai kayıtları</small></button>
 <button className="overview-card overview-card-staff" onClick={()=>chooseTab("personel")}><span>Aktif Personel</span><strong>{staff.filter(s=>s.active).length}</strong><small>Kayıtlı aktif personel</small></button>
 <button className="overview-card overview-card-advance" onClick={()=>chooseTab("avans")}><span>Bu Ay Avanslar</span><strong>{tl(advances.filter(a=>a.advance_date.slice(0,7)===day().slice(0,7)).reduce((sum,a)=>sum+Number(a.amount),0))}</strong><small>Bu ay kaydedilen avanslar</small></button>
 <button className="overview-card overview-card-leave" onClick={()=>chooseTab("izin")}><span>Bu Ay İzin Günleri</span><strong>{daysOff.filter(d=>d.leave_date.slice(0,7)===day().slice(0,7)).length}</strong><small>İzin kayıtları</small></button>
 <button className="overview-card overview-card-announcements" onClick={()=>chooseTab("duyurular")}><span>Duyurular</span><strong>{announcements.length}</strong><small>Paylaşılan genel duyurular</small></button>
 </div>
 <section className="panel"><h2>Son Giriş / Çıkış Hareketleri</h2>{shifts.slice(0,8).map(s=><div key={s.id} className="row"><span><b>{label(s.staff_id)}</b><p className="muted">{stamp(s.check_in)}</p></span><span>{s.check_out?"Çıkış: "+stamp(s.check_out):"Çıkış bekleniyor"}</span></div>)}{shifts.length===0&&<p className="muted">Henüz mesai kaydı bulunmuyor.</p>}</section>
 <div className="overview-quick"><button onClick={()=>chooseTab("personel")}>Personel Ekle</button><button onClick={()=>chooseTab("avans")}>Avans Ekle</button><button onClick={()=>chooseTab("duyurular")}>Duyuru Gönder</button><button onClick={()=>chooseTab("raporlar")}>Raporları Aç</button></div>
 </section>}
 {manager&&tab==="personel"&&<StaffManagement sb={sb} staff={staff} onCreate={async d=>await api({action:"create_staff",...d})} onSaved={refresh}/>}
 {manager&&tab==="personel"&&<section className="panel"><h2>Hesap Yönetimi</h2><p className="muted">Şifre yenileme ve aktif/pasif işlemleri sadece yönetici tarafından yapılabilir.</p>{staff.map(s=><div className="row" key={s.id}><div><b>{s.full_name}</b><p className="muted">@{s.username} · {s.active?"Aktif":"Pasif"}</p></div><div className="actions"><button className="secondary" onClick={()=>{const pass=prompt("Yeni şifre (en az 8 karakter):");if(pass)doTask(()=>api({action:"reset_password",id:s.id,password:pass}),"Şifre yenilendi.")}}>Şifreyi Yenile</button><button className={s.active?"danger":"secondary"} onClick={()=>{if(confirm(s.active?"Personel hesabı pasife alınsın mı?":"Personel hesabı aktifleştirilsin mi?"))doTask(()=>api({action:"set_active",id:s.id,active:!s.active}))}}>{s.active?"Pasife Al":"Aktifleştir"}</button></div></div>)}</section>}
 {manager&&tab==="ayarlar"&&<><CompanySettings sb={sb} managerId={profile.id} managerName={profile.full_name}/>
 <section className="panel">
 <h2>WhatsApp Mesai Bildirimleri</h2>
 <p className="muted">Personel otel Wi-Fi üzerinden giriş yaptığında patronun telefonuna, personel giriş veya çıkış yaptığında ise izin vermiş personelin kendi WhatsApp numarasına şirket hesabından bildirim göndermek için ayarları kullanın.</p>
 <form className="whatsapp-settings-form" onSubmit={saveWhatsappSettings}>
 <label>Patron WhatsApp Numarası (ülke koduyla)
 <input type="tel" inputMode="tel" value={whatsappBossPhone} maxLength={22} placeholder="905XXXXXXXXX" onChange={e=>setWhatsappBossPhone(e.target.value)}/>
 </label>
 <label className="whatsapp-check">
 <input type="checkbox" checked={whatsappBossConsent} onChange={e=>setWhatsappBossConsent(e.target.checked)}/>
 <span>Patron bu numaradan mesai WhatsApp bildirimlerini almayı kabul etti.</span>
 </label>
 <label className="whatsapp-check">
 <input type="checkbox" checked={whatsappBossIn} onChange={e=>setWhatsappBossIn(e.target.checked)}/>
 <span>Personel giriş yapınca patrona bildirim gönder</span>
 </label>
 <label className="whatsapp-check">
 <input type="checkbox" checked={whatsappStaffIn} onChange={e=>setWhatsappStaffIn(e.target.checked)}/>
 <span>Personel giriş yapınca kendi numarasına bildirim gönder</span>
 </label>
 <label className="whatsapp-check">
 <input type="checkbox" checked={whatsappStaffOut} onChange={e=>setWhatsappStaffOut(e.target.checked)}/>
 <span>Personel çıkış yapınca kendi numarasına bildirim gönder</span>
 </label>
 <button disabled={whatsappSaving}>{whatsappSaving?"Kaydediliyor...":"WhatsApp Ayarlarını Kaydet"}</button>
 </form>
 <div className="whatsapp-connection-note" role="status">
 <b>Otomatik WhatsApp gönderimi henüz doğrulanmadı</b>
 <p>Bu bölüm yalnızca numara ve bildirim tercihlerini kaydeder. Mesaj göndermek için otel numarasının WhatsApp Business Platform API bağlantısı ve onaylı şablonları gerekir. Bu bağlantı tamamlanmadan gerçek mesaj beklemeyin.</p>
 </div>
 {whatsappSettings&&<p className="muted">Kayıtlı patron numarası: <b>{whatsappSettings.boss_phone||"Tanımlanmadı"}</b> · İzin: <b>{whatsappSettings.boss_consent?"Açık":"Kapalı"}</b> · Giriş bildirimi: <b>{whatsappSettings.boss_clock_in_enabled?"Açık":"Kapalı"}</b></p>}
 <p className="hint">Personel kendi Ayarlar bölümünden WhatsApp bildirimlerine izin vermelidir. Mesaj göndermek için Meta WhatsApp Business Platform bağlantısı ve onaylı mesaj şablonları gerekir.</p>
 </section>
 <section className="panel"><h2>İzin Talebi E-posta Bildirimleri</h2>
 <p className="muted">Personel izin talebi gönderdiğinde bildirim almak istediğiniz e-posta adresini buraya yazın. Uygulama içi izin bildirimleri bu ayardan bağımsız çalışır.</p>
 <form key={profile.id+":"+(profile.contact_email||"")} onSubmit={saveManagerEmail} style={{marginTop:14,maxWidth:480}}>
 <label>Bildirim e-posta adresi<input name="notify_email" type="email" placeholder="ornek@otel.com" defaultValue={profile.contact_email||""} maxLength={180}/></label>
 <div className="actions"><button disabled={emailSaving}>{emailSaving?"Kaydediliyor...":"E-posta Adresini Kaydet"}</button></div>
 </form>
 <p className="hint">E-posta gönderimi için ayrıca güvenli gönderim servisi (Resend) kurulmalıdır. Servis etkinleşene kadar izin talepleriniz uygulamada bildirim olarak görünmeye devam eder.</p>
 </section>
 <section className="panel"><h2>Otel Wi-Fi Ağını Tanımla</h2><p className="muted">Personeller yalnızca tanımladığınız otel ağından mesai giriş ve çıkışı yapabilir. Bu işlemi yaparken telefonunuzun veya bilgisayarınızın otelin Wi-Fi ağına bağlı olduğundan emin olun.</p><div className="actions" style={{marginTop:14}}><button disabled={busy} onClick={()=>doTask(async()=>{const {data,error}=await sb.rpc("hotel_register_wifi");if(error)throw error;if(!data)throw Error("Ağ bilgisi alınamadı")}, "Otel Wi-Fi ağı tanımlandı.")}>Bu Wi-Fi Ağını Tanımla</button></div>{wifiNetworks.length>0?<div style={{marginTop:12}}>{wifiNetworks.map(w=><div className="row" key={w.id}><span>Tanımlı Ağ: <b>{w.ip}</b></span><button className="danger" disabled={busy} onClick={()=>{if(confirm("Bu Wi-Fi ağı kaldırılacak. Bu ağdan mesai yapılamayacak. Devam edilsin mi?"))doTask(async()=>{const {error}=await sb.rpc("hotel_remove_wifi",{p_id:w.id});if(error)throw error},"Wi-Fi ağı kaldırıldı.")}}>Kaldır</button></div>)}</div>:<p className="hint">Henüz otel Wi-Fi ağı tanımlanmadı. Tanımlanana kadar personel mesai giriş-çıkışı kapalıdır.</p>}</section>
 </>}
 {tab==="mesai"&&<>{!manager&&<section className="panel"><h2>Mesai Giriş / Çıkış</h2><p className="muted">Bu ay toplam çalışma: {totalHours.toFixed(1)} saat</p><p className="hint">{ownOpen?"Açık mesainiz bulunuyor. Çıkış yapabilirsiniz.":"Aktif mesainiz bulunmuyor."}</p><div className="actions" style={{marginTop:15}}><button disabled={busy||!!ownOpen} onClick={()=>doTask(async()=>{const {error}=await sb.rpc("hotel_clock_in");if(error)throw error},"Giriş başarıyla kaydedildi ✓")}>Giriş Yap</button><button className="secondary" disabled={busy||!ownOpen} onClick={()=>doTask(async()=>{const {error}=await sb.rpc("hotel_clock_out");if(error)throw error},"Çıkış başarıyla kaydedildi ✓")}>Çıkış Yap</button></div></section>}
 {manager&&editShift&&<section className="panel"><h2>Mesai Düzenle</h2><p>{label(editShift.staff_id)}</p><form key={editShift.id} onSubmit={e=>{e.preventDefault();const d=values(e);doTask(async()=>{const a=new Date(d.check_in),b=d.check_out?new Date(d.check_out):null;if(Number.isNaN(a.getTime())||(b&&b<a))throw Error("Saatleri kontrol edin.");const {error}=await sb.from("hotel_attendance").update({check_in:a.toISOString(),check_out:b?.toISOString()||null,work_date:d.check_in.slice(0,10),edited_by:profile.id,updated_at:new Date().toISOString()}).eq("id",editShift.id);if(error)throw error})}}>
 <label>Giriş Saati<input name="check_in" type="datetime-local" defaultValue={localTime(editShift.check_in)} required/></label><label>Çıkış Saati<input name="check_out" type="datetime-local" defaultValue={localTime(editShift.check_out)}/></label><div className="actions"><button disabled={busy}>Kaydet</button><button type="button" className="secondary" onClick={()=>setEditShift(null)}>İptal</button></div></form></section>}
 <section className="panel"><h2>{manager?"Tüm Personel Mesaileri":"Mesai Kayıtlarım"}</h2>
 {shifts.length===0?<p className="muted">Henüz kayıt bulunmuyor.</p>:manager?
 <div className="day-folders">{shiftsByDate.map(([workDate,records])=>
 <details className="day-folder" key={workDate}>
 <summary><span className="day-title">{workDate.split("-").reverse().join(".")}</span><span className="day-count">{records.length} kayıt · {records.filter(s=>!!s.check_out).length} çıkış yapıldı</span></summary>
 {renderShiftTable(records)}
 </details>)}</div>:
 renderShiftTable(shifts)}
 </section></>}
 {tab==="avans"&&<>{manager&&<section className="panel"><h2>{editAdvance?"Avans Düzenle":"Avans Kaydet"}</h2><form key={editAdvance?.id||"new"} onSubmit={e=>{e.preventDefault();const d=values(e);doTask(async()=>{const obj={staff_id:d.staff_id,amount:Number(d.amount),advance_date:d.advance_date,note:d.note};const q=editAdvance?sb.from("hotel_advances").update(obj).eq("id",editAdvance.id):sb.from("hotel_advances").insert({...obj,created_by:profile.id});const {error}=await q;if(error)throw error})}}>
 <label>Personel<select name="staff_id" defaultValue={editAdvance?.staff_id||staff[0]?.id} required>{staff.map(s=><option key={s.id} value={s.id}>{s.full_name}</option>)}</select></label><label>Tutar (₺)<input name="amount" type="number" min="1" step="0.01" defaultValue={editAdvance?.amount||""} required/></label><label>Avans Tarihi<input name="advance_date" type="date" defaultValue={editAdvance?.advance_date||day()} required/></label><label>Açıklama<input name="note" maxLength={500} defaultValue={editAdvance?.note||""}/></label><div className="actions"><button disabled={busy||staff.length===0}>{editAdvance?"Değişiklikleri Kaydet":"Avans Ekle"}</button>{editAdvance&&<button type="button" className="secondary" onClick={()=>setEditAdvance(null)}>İptal</button>}</div></form></section>}
 <section className="panel"><h2>{manager?"Avans Kayıtları":"Aldığım Avanslar"}</h2>{advances.length?advances.map(a=><div className="row" key={a.id}><div><b>{tl(a.amount)}</b> · {a.advance_date}{manager&&<p>{label(a.staff_id)}</p>}<p className="muted">{a.note}</p></div>{manager&&<div className="actions"><button className="secondary" onClick={()=>setEditAdvance(a)}>Düzenle</button><button className="danger" onClick={()=>{if(confirm("Bu avans kaydı silinsin mi?"))doTask(async()=>{const {error}=await sb.from("hotel_advances").delete().eq("id",a.id);if(error)throw error})}}>Sil</button></div>}</div>):<p className="muted">Avans kaydı bulunmuyor.</p>}</section></>}
 {tab==="izin"&&<>{manager&&<section className="panel leave-notifications-panel">
 <h2>🔔 Yeni İzin Bildirimleri {unreadLeaveNoticeCount>0&&<span className="notifications-unread">{unreadLeaveNoticeCount} okunmamış</span>}</h2>
 <p className="muted">Personel izin talebi gönderdiğinde buraya bildirim düşer. Bildirimler yönetici oturumu açıkken otomatik yenilenir.</p>
 {leaveNotices.length===0?<p className="muted">Henüz yeni izin bildirimi bulunmuyor.</p>:leaveNotices.map(n=><div className={"row leave-notice "+(!n.read_at?"leave-notice-new":"")} key={n.id}>
 <div><b>{n.title}</b><p>{n.message}</p><small className="muted">{stamp(n.created_at)}{n.email_sent_at?" · E-posta gönderildi":""}</small></div>
 {!n.read_at?<button className="secondary" onClick={()=>void markLeaveNotice(n.id)}>Okundu İşaretle</button>:<small className="muted">✓ Okundu</small>}
 </div>)}
 </section>}{manager&&<ManagerLeaveRequests sb={sb} names={Object.fromEntries(users.map(u=>[u.id,u.full_name]))}/>}{manager&&<section className="panel"><h2>{editDay?"İzin Düzenle":"Haftalık İzin Kaydet"}</h2><form key={editDay?.id||"new"} onSubmit={e=>{e.preventDefault();const d=values(e);doTask(async()=>{const obj={staff_id:d.staff_id,leave_date:d.leave_date,note:d.note};const q=editDay?sb.from("hotel_days_off").update(obj).eq("id",editDay.id):sb.from("hotel_days_off").insert({...obj,created_by:profile.id});const {error}=await q;if(error)throw error})}}>
 <label>Personel<select name="staff_id" defaultValue={editDay?.staff_id||staff[0]?.id} required>{options}</select></label><label>İzin Günü<input name="leave_date" type="date" defaultValue={editDay?.leave_date||day()} required/></label><label>Açıklama<input name="note" maxLength={500} defaultValue={editDay?.note||""}/></label><div className="actions"><button disabled={busy||staff.length===0}>{editDay?"Değişiklikleri Kaydet":"İzin Ekle"}</button>{editDay&&<button type="button" className="secondary" onClick={()=>setEditDay(null)}>İptal</button>}</div></form></section>}
 <section className="panel"><h2>{manager?"İzin Kayıtları":"Haftalık İzinlerim"}</h2>{daysOff.length?daysOff.map(d=><div className="row" key={d.id}><div><b>{d.leave_date}</b>{manager&&<p>{label(d.staff_id)}</p>}<p className="muted">{d.note}</p></div>{manager&&<div className="actions"><button className="secondary" onClick={()=>setEditDay(d)}>Düzenle</button><button className="danger" onClick={()=>{if(confirm("Bu izin kaydı silinsin mi?"))doTask(async()=>{const {error}=await sb.from("hotel_days_off").delete().eq("id",d.id);if(error)throw error})}}>Sil</button></div>}</div>):<p className="muted">İzin kaydı bulunmuyor.</p>}</section></>}

 {manager&&tab==="raporlar"&&<ReportsPanel sb={sb} staff={staff}/>}
 {manager&&tab==="aylik"&&<section className="panel monthly-report">
  <h2>Aylık Personel İşlemleri</h2>
  <p className="muted">Personeli ve ayı seçerek giriş-çıkış, avans ve izin detaylarını görüntüleyebilirsiniz.</p>
  <div className="month-filters">
    <label>Ay<input type="month" value={monthlyMonth} onChange={e=>setMonthlyMonth(e.target.value)} min="2020-01" max="2100-12" /></label>
    <label>Personel<select value={monthlyStaff||staff[0]?.id||""} onChange={e=>setMonthlyStaff(e.target.value)}>{staff.map(s=><option key={s.id} value={s.id}>{s.full_name}</option>)}</select></label>
    <button disabled={monthlyLoading||monthlyExporting||!!monthlyError||staff.length===0} onClick={exportMonthly}>{monthlyExporting?"Excel hazırlanıyor...":"Excel'e Aktar (.xlsx)"}</button>
  </div>
  {staff.length===0?<p className="muted">Henüz personel bulunmuyor.</p>:<>
   {monthlyError&&<div className="error">{monthlyError}</div>}
   {monthlyLoading?<p className="muted">Seçilen aya ait kayıtlar yükleniyor...</p>:!monthlyError&&<>
    <h3 className="monthly-heading">{monthTitle.toLocaleUpperCase("tr-TR")} · {users.find(s=>s.id===(monthlyStaff||staff[0]?.id))?.full_name}</h3>
    <div className="monthly-stats">
      <div><span>Toplam Avans</span><strong>{tl(monthlyTotal)}</strong><small>{monthlyAdvances.length} avans kaydı</small></div>
      <div><span>Toplam Mesai</span><strong>{monthlyHours.toFixed(1)} saat</strong><small>{monthlyShifts.length} giriş kaydı</small></div>
      <div><span>İzin Günleri</span><strong>{monthlyDaysOff.length} gün</strong><small>Seçilen aya ait izinler</small></div>
    </div>
    <section className="monthly-section"><h3>Avans Detayları</h3>
    {monthlyAdvances.length?<div className="table-wrap"><table><thead><tr><th>Tarih</th><th>Avans Tutarı</th><th>Açıklama</th></tr></thead><tbody>
    {monthlyAdvances.map(a=><tr key={a.id}><td>{a.advance_date.split("-").reverse().join(".")}</td><td>{tl(Number(a.amount))}</td><td>{a.note||"—"}</td></tr>)}
    </tbody><tfoot><tr><th>Toplam</th><th>{tl(monthlyTotal)}</th><th></th></tr></tfoot></table></div>:<p className="muted">Bu ay avans kaydı bulunmuyor.</p>}
    </section>
    <section className="monthly-section"><h3>Giriş / Çıkış ve Mesai</h3>
    {monthlyShifts.length?<div className="table-wrap"><table><thead><tr><th>Tarih</th><th>Giriş</th><th>Çıkış</th><th>Çalışma</th></tr></thead><tbody>
    {monthlyShifts.map(s=><tr key={s.id}><td>{s.work_date.split("-").reverse().join(".")}</td><td>{stamp(s.check_in)}</td><td>{stamp(s.check_out)}</td><td>{s.check_out?((new Date(s.check_out).getTime()-new Date(s.check_in).getTime())/3600000).toFixed(2)+" saat":"Çıkış yapılmadı"}</td></tr>)}
    </tbody><tfoot><tr><th colSpan={3}>Toplam Çalışma</th><th>{monthlyHours.toFixed(2)} saat</th></tr></tfoot></table></div>:<p className="muted">Bu ay mesai kaydı bulunmuyor.</p>}
    </section>
    <section className="monthly-section"><h3>İzin Günleri</h3>
    {monthlyDaysOff.length?<div className="table-wrap"><table><thead><tr><th>Gün</th><th>Açıklama</th></tr></thead><tbody>
    {monthlyDaysOff.map(d=><tr key={d.id}><td>{d.leave_date.split("-").reverse().join(".")}</td><td>{d.note||"—"}</td></tr>)}
    </tbody></table></div>:<p className="muted">Bu ay izin kaydı bulunmuyor.</p>}
    </section>
   </>}
  </>}
 </section>}

 {tab==="duyurular"&&<section className="panel announcements-panel">
   <h2>🔔 {manager?"Genel Duyurular":"Bildirimlerim"} {unreadAnnouncementCount>0&&<span className="notifications-unread">{unreadAnnouncementCount} yeni</span>}</h2>
   <p className="muted">Buradaki duyurular uygulama üzerinden paylaşılır. Yeni bir mesaj varsa zil simgesindeki sayı artar.</p>
   {manager&&<section className="announcement-compose">
     <h3>Personele Genel Mesaj Gönder</h3>
     <form onSubmit={sendAnnouncement}>
       <label>Başlık<input name="title" type="text" minLength={3} maxLength={120} placeholder="Örn. Yarınki vardiyalar" required/></label>
       <label>Mesaj<textarea name="body" rows={5} minLength={2} maxLength={3000} placeholder="Tüm personele göndermek istediğiniz duyuru..." required/></label>
       <button disabled={sendingAnnouncement}>{sendingAnnouncement?"Gönderiliyor...":"Tüm Personele Gönder"}</button>
     </form>
   </section>}
   <h3>Gönderilen Mesajlar</h3>
   {announcements.length===0?<p className="muted">Henüz duyuru yok.</p>:
   <div className="announcements-list">{announcements.map(a=>{
     const isRead=announcementReads.some(r=>r.announcement_id===a.id);
     return <article className={"announcement-item "+(!isRead?"announcement-new":"")} key={a.id}>
       <div className="announcement-title"><strong>{a.title}</strong>{!isRead&&<span className="notifications-unread">Yeni</span>}</div>
       <small className="muted">{stamp(a.created_at)}</small>
       <p className="announcement-body">{a.body}</p>
       <div className="actions">
       {!isRead&&<button className="secondary" onClick={()=>markAnnouncementRead(a.id)}>Okundu Olarak İşaretle</button>}
       {isRead&&<small className="muted">✓ Okundu</small>}
       {manager&&<button className="danger" onClick={()=>deleteAnnouncement(a.id)}>Sil</button>}
       </div>
     </article>
   })}</div>}
 </section>}
 <p className="foot">Bayrak Grand Hotel · Trabzon · Personel Takip Sistemi</p></main></>;
}
