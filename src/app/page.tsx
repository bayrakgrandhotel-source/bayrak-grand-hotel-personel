"use client";
import {createClient} from "@supabase/supabase-js";
import {useEffect,useState} from "react";
import type {FormEvent} from "react";
import ReportsPanel from "./ReportsPanel";

const SB_URL="https://wksbzfrpyrjzopoxnajc.supabase.co";
const SB_KEY="sb_publishable_pzEUUtm95mpq3vynU2rVWQ_Z_82dfjl";
const sb=createClient(SB_URL,SB_KEY,{auth:{persistSession:false,autoRefreshToken:true}});
const email=(s:string)=>s.trim().toLowerCase()+"@personel.bayrak.example";
type Profile={id:string;username:string;full_name:string;login_email:string;role:"manager"|"staff";active:boolean};
type Shift={id:string;staff_id:string;work_date:string;check_in:string;check_out:string|null};
type Advance={id:string;staff_id:string;advance_date:string;amount:number;note:string|null};
type DayOff={id:string;staff_id:string;leave_date:string;note:string|null};
type HotelWifi={id:string;ip:string;created_at:string};
type Announcement={id:string;title:string;body:string;created_at:string;created_by:string};
type AnnouncementRead={announcement_id:string;staff_id:string;read_at:string};
type Tab="personel"|"mesai"|"avans"|"izin"|"aylik"|"duyurular"|"raporlar";
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
 const [wifiNetworks,setWifiNetworks]=useState<HotelWifi[]>([]);
 const [announcements,setAnnouncements]=useState<Announcement[]>([]);
 const [announcementReads,setAnnouncementReads]=useState<AnnouncementRead[]>([]);
 const [sendingAnnouncement,setSendingAnnouncement]=useState(false);
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
 async function refresh(){
   const {data:{user},error:authError}=await sb.auth.getUser();
   if(authError||!user){setProfile(null);setLoading(false);return}
   const {data:me,error:pErr}=await sb.from("hotel_profiles").select("*").eq("id",user.id).maybeSingle();
   if(pErr||!me||!me.active){await sb.auth.signOut();setProfile(null);setLoading(false);tell("Hesap bulunamadı veya pasif durumda.",true);return}
   const isManager=me.role==="manager";
   const p=isManager?sb.from("hotel_profiles").select("*"):sb.from("hotel_profiles").select("*").eq("id",user.id);
   const results=await Promise.all([p,sb.from("hotel_attendance").select("*").order("check_in",{ascending:false}).limit(400),sb.from("hotel_advances").select("*").order("advance_date",{ascending:false}).limit(400),sb.from("hotel_days_off").select("*").order("leave_date",{ascending:false}).limit(400),sb.from("hotel_announcements").select("*").order("created_at",{ascending:false}).limit(100),sb.from("hotel_announcement_reads").select("announcement_id,staff_id,read_at").eq("staff_id",user.id).limit(200)]);
   const problem=results.find(x=>x.error)?.error;
   if(problem)throw Error(problem.message);
   if(isManager){const {data:wifi,error:wifiErr}=await sb.from("hotel_wifi_networks").select("id,ip,created_at").order("created_at",{ascending:false});if(wifiErr)throw wifiErr;setWifiNetworks(wifi as HotelWifi[]||[])}else setWifiNetworks([]);
   setProfile(me as Profile);setUsers(results[0].data as Profile[]||[]);
   setShifts(results[1].data as Shift[]||[]);setAdvances(results[2].data as Advance[]||[]);setDaysOff(results[3].data as DayOff[]||[]);setAnnouncements(results[4].data as Announcement[]||[]);setAnnouncementReads(results[5].data as AnnouncementRead[]||[]);
   setLoading(false);
 }
 useEffect(()=>{
   setSetup(new URLSearchParams(window.location.search).get("kurulum")==="1");
   refresh().catch(e=>{handleError(e);setLoading(false)});
   const {data}=sb.auth.onAuthStateChange((event)=>{if(event==="SIGNED_OUT"){setProfile(null)}});
   const logoutWhenHidden=()=>{if(document.visibilityState==="hidden")void sb.auth.signOut({scope:"local"})};
   const logoutWhenLeaving=()=>{void sb.auth.signOut({scope:"local"})};
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
 async function logout(){await sb.auth.signOut();setProfile(null);setAnnouncements([]);setAnnouncementReads([]);tell("");setTab("mesai")}
 function chooseTab(t:Tab){setTab(t);setEditShift(null);setEditAdvance(null);setEditDay(null);tell("")}
 const staff=users.filter(p=>p.role==="staff");
 const unreadAnnouncementCount=announcements.filter(a=>!announcementReads.some(r=>r.announcement_id===a.id)).length;
 const label=(id:string)=>users.find(p=>p.id===id)?.full_name||"Personel";
 const options=staff.map(s=><option key={s.id} value={s.id}>{s.full_name} ({s.username})</option>);
 const ownOpen=shifts.find(s=>s.staff_id===profile?.id&&!s.check_out);
 const totalHours=shifts.filter(s=>s.staff_id===profile?.id&&s.check_out&&s.work_date.slice(0,7)===day().slice(0,7)).reduce((sum,s)=>sum+(new Date(s.check_out!).getTime()-new Date(s.check_in).getTime())/3600000,0);
 const monthlyTotal=monthlyAdvances.reduce((sum,a)=>sum+Number(a.amount),0);
 const monthlyHours=monthlyShifts.reduce((sum,s)=>sum+(s.check_out?Math.max(0,(new Date(s.check_out).getTime()-new Date(s.check_in).getTime())/3600000):0),0);
 const monthTitle=/^\d{4}-\d{2}$/.test(monthlyMonth)?new Intl.DateTimeFormat("tr-TR",{month:"long",year:"numeric",timeZone:"UTC"}).format(new Date(monthlyMonth+"-01T12:00:00Z")):monthlyMonth;
 const shiftsByDate=Object.entries(shifts.reduce<Record<string,Shift[]>>((groups,s)=>{(groups[s.work_date]??=[]).push(s);return groups;},{})).sort(([a],[b])=>b.localeCompare(a));
 const renderShiftTable=(records:Shift[])=><div className="table-wrap"><table><thead><tr>{manager&&<th>Personel</th>}<th>Giriş</th><th>Çıkış</th><th>Süre</th>{manager&&<th>İşlem</th>}</tr></thead><tbody>{records.map(s=><tr key={s.id}>{manager&&<td>{label(s.staff_id)}</td>}<td>{stamp(s.check_in)}</td><td>{stamp(s.check_out)}</td><td>{s.check_out?((new Date(s.check_out).getTime()-new Date(s.check_in).getTime())/3600000).toFixed(1)+" sa":"—"}</td>{manager&&<td><div className="actions"><button className="secondary" onClick={()=>setEditShift(s)}>Düzenle</button><button className="danger" disabled={busy} onClick={()=>{if(confirm(label(s.staff_id)+" adlı personelin "+stamp(s.check_in)+" tarihli mesai giriş ve çıkış kaydı tamamen silinsin mi? Bu işlem geri alınamaz."))doTask(async()=>{const {data,error}=await sb.from("hotel_attendance").delete().eq("id",s.id).select("id");if(error)throw error;if(!data||data.length!==1)throw Error("Kayıt silinemedi. Yönetici yetkinizi kontrol edin.")},"Mesai kaydı silindi.")}}>Sil</button></div></td>}</tr>)}</tbody></table></div>;
 if(loading)return <div className="auth-wrap"><div className="auth-card"><img src="/bayrak-logo-new.png" alt="Bayrak Grand Hotel logosu" className="hotel-logo hotel-logo-loading"/><p className="sub">Uygulama açılıyor...</p></div></div>;
 if(!profile)return <main className="auth-wrap"><div className="auth-card"><img src="/bayrak-logo-new.png" alt="Bayrak Grand Hotel logosu" className="hotel-logo"/><h1 className="brand">BAYRAK GRAND HOTEL</h1><p className="sub">{setup?"İlk Yönetici Hesabı":"Personel Takip Sistemi"}</p>
   {setup?<form onSubmit={bootstrap}>
     <label>Özel kurulum anahtarı<input name="key" type="password" autoComplete="off" required/></label>
     <label>Yönetici Ad Soyad<input name="full_name" required minLength={2} maxLength={100}/></label>
     <label>Yönetici Kullanıcı Adı<input name="username" required pattern="[a-z0-9._-]{3,30}" placeholder="yonetici"/></label>
     <label>Yeni Şifre<input name="password" type="password" autoComplete="new-password" required minLength={8}/></label>
     <button disabled={busy}>Yönetici Hesabını Oluştur</button><a href="/">Giriş ekranına dön</a>
   </form>:<form onSubmit={login}><label>Kullanıcı Adı<input name="username" autoComplete="username" required placeholder="Kullanıcı adınız"/></label><label>Şifre<input type="password" name="password" autoComplete="current-password" required placeholder="Şifreniz"/></label><button disabled={busy}>Giriş Yap</button></form>}
   {error&&<div className="error">{error}</div>}{success&&<div className="success">{success}</div>}
   <footer>TRABZON · Güvenli Personel Girişi</footer></div></main>;
 return <><header className="top"><span className="top-brand"><img src="/bayrak-logo-new.png" alt="Bayrak Grand Hotel logosu" className="hotel-logo-small"/><strong>BAYRAK GRAND HOTEL</strong></span><div className="top-actions"><button className="bell-button" type="button" title="Bildirimler" aria-label={"Bildirimler, "+unreadAnnouncementCount+" okunmamış"} onClick={()=>chooseTab("duyurular")}><span aria-hidden="true">🔔</span>{unreadAnnouncementCount>0&&<span className="bell-count">{unreadAnnouncementCount>99?"99+":unreadAnnouncementCount}</span>}</button><button className="secondary" onClick={logout}>Çıkış Yap</button></div></header><main className="shell">
 <div className="welcome"><div><h1>Merhaba, {profile.full_name}</h1><p className="muted">{manager?"Yönetici Paneli":"Personel Paneli"}</p></div><button className="secondary" onClick={()=>doTask(refresh,"Kayıtlar yenilendi.")} disabled={busy}>Yenile</button></div>
 <div className="tabs">{(manager?[["personel","Personeller"],["mesai","Giriş / Çıkış"],["avans","Avanslar"],["izin","Haftalık İzinler"],["aylik","Aylık İşlemler"],["raporlar","Raporlar"],["duyurular","Duyurular"]]:[["mesai","Giriş / Çıkış"],["avans","Avanslarım"],["izin","İzinlerim"],["duyurular","Bildirimler"]]).map(([id,name])=><button key={id} className={tab===id?"active":""} onClick={()=>chooseTab(id as Tab)}>{name}</button>)}</div>
 {error&&<div className="error">{error}</div>}{success&&<div className="success">{success}</div>}
 {manager&&tab==="personel"&&<section className="panel"><h2>Otel Wi-Fi Ağını Tanımla</h2><p className="muted">Personeller yalnızca tanımladığınız otel ağından mesai giriş ve çıkışı yapabilir. Bu işlemi yaparken telefonunuzun veya bilgisayarınızın otelin Wi-Fi ağına bağlı olduğundan emin olun.</p><div className="actions" style={{marginTop:14}}><button disabled={busy} onClick={()=>doTask(async()=>{const {data,error}=await sb.rpc("hotel_register_wifi");if(error)throw error;if(!data)throw Error("Ağ bilgisi alınamadı")}, "Otel Wi-Fi ağı tanımlandı.")}>Bu Wi-Fi Ağını Tanımla</button></div>{wifiNetworks.length>0?<div style={{marginTop:12}}>{wifiNetworks.map(w=><div className="row" key={w.id}><span>Tanımlı Ağ: <b>{w.ip}</b></span><button className="danger" disabled={busy} onClick={()=>{if(confirm("Bu Wi-Fi ağı kaldırılacak. Bu ağdan mesai yapılamayacak. Devam edilsin mi?"))doTask(async()=>{const {error}=await sb.rpc("hotel_remove_wifi",{p_id:w.id});if(error)throw error},"Wi-Fi ağı kaldırıldı.")}}>Kaldır</button></div>)}</div>:<p className="hint">Henüz otel Wi-Fi ağı tanımlanmadı. Tanımlanana kadar personel mesai giriş-çıkışı kapalıdır.</p>}</section>}
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
 {tab==="izin"&&<>{manager&&<section className="panel"><h2>{editDay?"İzin Düzenle":"Haftalık İzin Kaydet"}</h2><form key={editDay?.id||"new"} onSubmit={e=>{e.preventDefault();const d=values(e);doTask(async()=>{const obj={staff_id:d.staff_id,leave_date:d.leave_date,note:d.note};const q=editDay?sb.from("hotel_days_off").update(obj).eq("id",editDay.id):sb.from("hotel_days_off").insert({...obj,created_by:profile.id});const {error}=await q;if(error)throw error})}}>
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
