"use client";
import {useEffect,useMemo,useState} from "react";
import type {SupabaseClient} from "@supabase/supabase-js";
type Staff={id:string;full_name:string;active:boolean};
type Log={id:string;staff_id:string;work_date:string;check_in:string;check_out:string|null};
type Plan={id:string;staff_id:string;work_date:string;planned_start:string;planned_end:string;note:string};
type Period="daily"|"weekly"|"monthly";
type ReportKind="entries"|"hours"|"late"|"early"|"absent"|"lateExit"|"open"|"active"|"summary"|"times"|"weeklyHours"|"monthlyHours";
type ReportRow={id:string;staff:string;staffId:string;date:string;entry:string;exit:string;hours:number;status:string;expected:string;lateMin:number;earlyMin:number;lateExitMin:number;planned:boolean;dayOff:boolean};
const dateTR=(iso:string)=>iso.split("-").reverse().join(".");
const hm=(iso:string|null)=>iso?new Intl.DateTimeFormat("tr-TR",{timeZone:"Europe/Istanbul",hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date(iso)):"—";
const minutes=(time:string)=>{const p=time.slice(0,5).split(":").map(Number);return p[0]*60+p[1]};
const istanbulDate=(date=new Date())=>new Intl.DateTimeFormat("en-CA",{year:"numeric",month:"2-digit",day:"2-digit",timeZone:"Europe/Istanbul"}).format(date);
const nextDate=(iso:string,days:number)=>{const d=new Date(iso+"T12:00:00Z");d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)};
const fmt=(v:number)=>v.toLocaleString("tr-TR",{maximumFractionDigits:2});
const days=(first:string,last:string)=>{const dates:string[]=[];for(let p=first;p<=last&&dates.length<32;p=nextDate(p,1))dates.push(p);return dates};
export default function ReportsPanel({sb,staff}: {sb:SupabaseClient;staff:Staff[]}){
 const [period,setPeriod]=useState<Period>("daily"),[kind,setKind]=useState<ReportKind>("entries");
 const [selectedDay,setSelectedDay]=useState(istanbulDate()),[selectedMonth,setSelectedMonth]=useState(istanbulDate().slice(0,7));
 const [staffId,setStaffId]=useState("all");
 const [records,setRecords]=useState<Log[]>([]),[plans,setPlans]=useState<Plan[]>([]),[leaveDates,setLeaveDates]=useState<{staff_id:string;leave_date:string}[]>([]);
 const [loading,setLoading]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState(""),[saving,setSaving]=useState(false),[exporting,setExporting]=useState(false);
 const [plannedStaff,setPlannedStaff]=useState(""),[planDate,setPlanDate]=useState(istanbulDate()),[start,setStart]=useState("09:00"),[end,setEnd]=useState("18:00");
 const monthStart=selectedMonth+"-01";
 const dayNum=new Date(selectedDay+"T12:00:00Z").getUTCDay();
 const monday=nextDate(selectedDay,-((dayNum+6)%7));
 const from=period==="daily"?selectedDay:period==="weekly"?monday:monthStart;
 const until=period==="daily"?selectedDay:period==="weekly"?nextDate(monday,6):nextDate(nextDate(monthStart,32).slice(0,7)+"-01",-1);
 const tomorrow=nextDate(until,1);
 const menu:{period:Period;title:string;items:{id:ReportKind;label:string}[]}[]=[
 {period:"daily",title:"Günlük",items:[{id:"entries",label:"Giriş - Çıkış Kayıtları"},{id:"hours",label:"Günlük Çalışma Süreleri"},{id:"late",label:"Geç Kalanlar"},{id:"early",label:"Erken Çıkanlar"},{id:"lateExit",label:"Geç Çıkanlar"},{id:"absent",label:"Gelmeyenler"},{id:"open",label:"Çıkış Yapmayanlar"},{id:"active",label:"Konumdaki Çalışanlar"},{id:"summary",label:"Çalışma Özeti"}]},
 {period:"weekly",title:"Haftalık",items:[{id:"weeklyHours",label:"Toplam Çalışma Süreleri"},{id:"times",label:"Giriş - Çıkış Saatleri"},{id:"late",label:"Geç Giriş Süreleri"},{id:"summary",label:"Çalışma Özeti"}]},
 {period:"monthly",title:"Aylık",items:[{id:"monthlyHours",label:"Toplam Çalışma Süreleri"},{id:"times",label:"Giriş - Çıkış Saatleri"},{id:"late",label:"Geç Giriş Süreleri"},{id:"early",label:"Geç Kalma - Erken Çıkma"},{id:"summary",label:"Çalışma Özeti"}]}
 ];
 useEffect(()=>{
   if(!/^\d{4}-\d{2}-\d{2}$/.test(from)||!/^\d{4}-\d{2}-\d{2}$/.test(until))return;
   let active=true;setLoading(true);setError("");
   Promise.all([
     sb.from("hotel_attendance").select("id,staff_id,work_date,check_in,check_out").gte("work_date",from).lte("work_date",until).order("check_in",{ascending:true}).limit(3000),
     sb.from("hotel_shift_plans").select("id,staff_id,work_date,planned_start,planned_end,note").gte("work_date",from).lte("work_date",until).limit(3000),
     sb.from("hotel_days_off").select("staff_id,leave_date").gte("leave_date",from).lte("leave_date",until).limit(3000)
   ]).then(res=>{
     if(!active)return;const problem=res.find(r=>r.error)?.error;if(problem)throw new Error(problem.message);
     setRecords(res[0].data||[]);setPlans(res[1].data||[]);setLeaveDates(res[2].data||[]);
   }).catch(e=>{if(active)setError(e instanceof Error?e.message:"Rapor yüklenemedi")}).finally(()=>{if(active)setLoading(false)});
   return()=>{active=false};
 },[sb,from,until,message]);
 const rows=useMemo(()=>{
   const result:ReportRow[]=[];
   const logs=new Set(records.map(r=>r.staff_id+"|"+r.work_date));
   for(const s of records){
     const person=staff.find(u=>u.id===s.staff_id);
     const plan=plans.find(p=>p.staff_id===s.staff_id&&p.work_date===s.work_date);
     const off=leaveDates.some(d=>d.staff_id===s.staff_id&&d.leave_date===s.work_date);
     const inMinutes=minutes(hm(s.check_in)),outMinutes=s.check_out?minutes(hm(s.check_out)):0;
     const expected=plan?plan.planned_start.slice(0,5)+" - "+plan.planned_end.slice(0,5):"—";
     const late=plan?Math.max(0,inMinutes-minutes(plan.planned_start)):0;
     const early=plan&&s.check_out?Math.max(0,minutes(plan.planned_end)-outMinutes):0;
     const lateExit=plan&&s.check_out?Math.max(0,outMinutes-minutes(plan.planned_end)):0;
     const duration=s.check_out?Math.max(0,(new Date(s.check_out).getTime()-new Date(s.check_in).getTime())/3600000):0;
     result.push({id:s.id,staff:person?.full_name||"Personel",staffId:s.staff_id,date:s.work_date,entry:hm(s.check_in),exit:hm(s.check_out),hours:duration,status:s.check_out?"Tamamlandı":"Çıkış bekleniyor",expected,lateMin:late,earlyMin:early,lateExitMin:lateExit,planned:!!plan,dayOff:off});
   }
   // Planned shift without attendance means a possible absence ONLY after work day has passed.
   const today=istanbulDate();
   for(const plan of plans){
     if(logs.has(plan.staff_id+"|"+plan.work_date)||plan.work_date>=today||leaveDates.some(d=>d.staff_id===plan.staff_id&&d.leave_date===plan.work_date))continue;
     const person=staff.find(u=>u.id===plan.staff_id);
     result.push({id:plan.id+"-absent",staff:person?.full_name||"Personel",staffId:plan.staff_id,date:plan.work_date,entry:"—",exit:"—",hours:0,status:"Gelmedi (planlı)",expected:plan.planned_start.slice(0,5)+" - "+plan.planned_end.slice(0,5),lateMin:0,earlyMin:0,lateExitMin:0,planned:true,dayOff:false});
   }
   return result.filter(r=>staffId==="all"||r.staffId===staffId).sort((a,b)=>b.date.localeCompare(a.date)||a.staff.localeCompare(b.staff,"tr"));
 },[records,plans,leaveDates,staffId,staff]);
 const planRequired=["late","early","lateExit","absent"].includes(kind);
 const planCount=plans.filter(p=>staffId==="all"||p.staff_id===staffId).length;
 const filtered=rows.filter(r=>{
  if(kind==="late")return r.lateMin>0&&r.entry!=="—";
  if(kind==="early")return r.earlyMin>0&&r.exit!=="—";
  if(kind==="lateExit")return r.lateExitMin>0&&r.exit!=="—";
  if(kind==="absent")return r.status==="Gelmedi (planlı)";
  if(kind==="open"||kind==="active")return r.status==="Çıkış bekleniyor";
  return kind==="hours"||kind==="weeklyHours"||kind==="monthlyHours"?r.entry!=="—":true;
 });
 const sumHours=filtered.reduce((a,b)=>a+b.hours,0);
 const uniquePeople=new Set(filtered.map(r=>r.staffId)).size;
 const heading=menu.find(m=>m.period===period)?.items.find(i=>i.id===kind)?.label||"Giriş Çıkış";
 const scope=period==="daily"?dateTR(selectedDay):period==="weekly"?dateTR(from)+" - "+dateTR(until):selectedMonth;
 function choose(p:Period,k:ReportKind){setPeriod(p);setKind(k);setError("");setMessage("")}
 async function savePlan(e:React.FormEvent<HTMLFormElement>){
   e.preventDefault();if(!plannedStaff||!planDate||start===end){setError("Personel, tarih ve farklı giriş-çıkış saatleri seçin.");return;}
   setSaving(true);setError("");setMessage("");
   try{
     const {data:auth}=await sb.auth.getUser();if(!auth.user)throw Error("Yönetici girişi gerekli.");
     const {error:err}=await sb.from("hotel_shift_plans").upsert({staff_id:plannedStaff,work_date:planDate,planned_start:start,planned_end:end,created_by:auth.user.id,updated_at:new Date().toISOString()},{onConflict:"staff_id,work_date"});
     if(err)throw err;
     setMessage("Vardiya planı kaydedildi. Raporlar güncellendi.");
   }catch(ex){setError(ex instanceof Error?ex.message:"Vardiya kaydedilemedi");}finally{setSaving(false)}
 }
 async function excel(){
   setExporting(true);setError("");
   try{
     const {default:ExcelJS}=await import("exceljs");const wb=new ExcelJS.Workbook();wb.creator="Bayrak Grand Hotel";
     const ws=wb.addWorksheet("Rapor");
     ws.columns=[{header:"Tarih",key:"date",width:17},{header:"Personel",key:"staff",width:25},{header:"Giriş",key:"in",width:17},{header:"Çıkış",key:"out",width:17},{header:"Süre (saat)",key:"hours",width:17},{header:"Durum",key:"status",width:25},{header:"Planlanan",key:"plan",width:23},{header:"Geç (dk)",key:"late",width:14},{header:"Erken (dk)",key:"early",width:14}];
     ws.insertRow(1,["BAYRAK GRAND HOTEL — "+heading+" — "+scope]);ws.mergeCells("A1:I1");
     ws.getCell("A1").font={bold:true,size:15,color:{argb:"FFD6B27C"}};ws.getCell("A1").fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF241B14"}};ws.getRow(1).height=28;
     ws.getRow(2).eachCell(c=>{c.font={bold:true,color:{argb:"FFD6B27C"}};c.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF241B14"}}});
     for(const r of filtered)ws.addRow({date:dateTR(r.date),staff:r.staff,in:r.entry,out:r.exit,hours:Math.round(r.hours*100)/100,status:r.status,plan:r.expected,late:r.lateMin,early:r.earlyMin});
     const summary=ws.addRow({staff:"Toplam",hours:Math.round(sumHours*100)/100});summary.font={bold:true};ws.views=[{state:"frozen",ySplit:2}];
     const output=await wb.xlsx.writeBuffer();const blob=new Blob([new Uint8Array(output)],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});const url=URL.createObjectURL(blob);
     const a=document.createElement("a");a.href=url;a.download="Bayrak_Grand_Hotel_Rapor_"+period+"_"+from+".xlsx";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);
   }catch(ex){setError(ex instanceof Error?ex.message:"Excel hazırlanamadı")}finally{setExporting(false)}
 }
 return <section className="panel report-main">
  <h2>Raporlar</h2><p className="muted">Günlük, haftalık ve aylık personel analizleri</p>
  <div className="reports-layout">
   <nav className="report-menu" aria-label="Rapor türleri">
    {menu.map(group=><div key={group.period} className="report-menu-group">
      <div className="report-menu-title">{group.title}</div>
      {group.items.map(item=><button key={group.period+item.id} className={period===group.period&&kind===item.id?"report-link selected":"report-link"} onClick={()=>choose(group.period,item.id)}>{item.label}</button>)}
     </div>)}
   </nav>
   <div className="report-content">
    <h3>{heading}</h3>
    <div className="report-filters">
     {period==="monthly"?<label>Ay<input type="month" value={selectedMonth} onChange={e=>setSelectedMonth(e.target.value)}/></label>:<label>{period==="daily"?"Tarih":"Haftanın Günü"}<input type="date" value={selectedDay} onChange={e=>setSelectedDay(e.target.value)}/></label>}
     <label>Personel<select value={staffId} onChange={e=>setStaffId(e.target.value)}><option value="all">Tüm Personeller</option>{staff.map(s=><option key={s.id} value={s.id}>{s.full_name}</option>)}</select></label>
     <button onClick={excel} disabled={loading||exporting||!!error}>{exporting?"Hazırlanıyor...":"Excel'e Aktar"}</button>
    </div>
    <p className="report-period">Rapor aralığı: {scope}</p>
    {planRequired&&planCount===0&&<p className="report-warning">Bu dönem için planlanmış vardiya bulunmuyor. Geç kalma, erken çıkma ve gelmeme analizi vardiya planları eklendikten sonra hesaplanır.</p>}
    {kind==="active"&&<p className="report-warning">Konum doğrulaması yapılmıyor. Burada yalnızca çıkışı henüz kaydedilmemiş mesailer listelenir.</p>}
    {loading?<p className="muted">Rapor yükleniyor...</p>:error?<p className="error">{error}</p>:<>
     <div className="report-stats"><span><b>{filtered.length}</b> kayıt</span><span><b>{uniquePeople}</b> personel</span><span><b>{fmt(sumHours)}</b> toplam saat</span></div>
     {(kind==="weeklyHours"||kind==="monthlyHours"||kind==="summary")&&<div className="report-people">{staff.filter(s=>staffId==="all"||s.id===staffId).map(s=>{
       const selected=filtered.filter(r=>r.staffId===s.id);return <div key={s.id}><span>{s.full_name}</span><strong>{fmt(selected.reduce((n,r)=>n+r.hours,0))} saat</strong></div>
     })}</div>}
     <div className="table-wrap"><table className="reports-table"><thead><tr><th>Personel</th><th>Tarih</th><th>Giriş</th><th>Çıkış</th><th>Süre</th><th>Durum</th>{planRequired&&<th>Plan</th>}{kind==="late"&&<th>Geç (dk)</th>}{kind==="early"&&<th>Erken (dk)</th>}{kind==="lateExit"&&<th>Geç Çıkış (dk)</th>}</tr></thead>
     <tbody>{filtered.map(r=><tr key={r.id}><td>{r.staff}</td><td>{dateTR(r.date)}</td><td>{r.entry}</td><td>{r.exit}</td><td>{r.entry==="—"?"—":fmt(r.hours)+" sa"}</td><td>{r.status}</td>{planRequired&&<td>{r.expected}</td>}{kind==="late"&&<td>{r.lateMin}</td>}{kind==="early"&&<td>{r.earlyMin}</td>}{kind==="lateExit"&&<td>{r.lateExitMin}</td>}</tr>)}</tbody></table>{filtered.length===0&&<p className="muted" style={{padding:15}}>Bu rapor için kayıt bulunmuyor.</p>}</div>
    </>}
    <details className="report-plan" open={false}><summary>Vardiya Saatlerini Tanımla (Yönetici)</summary>
     <p className="muted">Geç kalma, erken çıkma ve gelmeme raporlarının hesaplanması için kişi ve gün bazında planlanan vardiya saatleri girilir.</p>
     <form onSubmit={savePlan} className="report-plan-form">
      <label>Personel<select value={plannedStaff} onChange={e=>setPlannedStaff(e.target.value)} required><option value="">Personel seç</option>{staff.map(s=><option value={s.id} key={s.id}>{s.full_name}</option>)}</select></label>
      <label>Vardiya Tarihi<input type="date" value={planDate} onChange={e=>setPlanDate(e.target.value)} required/></label>
      <label>Planlanan Giriş<input type="time" value={start} onChange={e=>setStart(e.target.value)} required/></label>
      <label>Planlanan Çıkış<input type="time" value={end} onChange={e=>setEnd(e.target.value)} required/></label>
      <button disabled={saving}>{saving?"Kaydediliyor...":"Vardiya Planını Kaydet"}</button>
     </form>
     {message&&<p className="success">{message}</p>}
     <div className="report-plans-list">{plans.filter(p=>staffId==="all"||p.staff_id===staffId).map(p=><div key={p.id}><span>{dateTR(p.work_date)} · {staff.find(s=>s.id===p.staff_id)?.full_name} · {p.planned_start.slice(0,5)} - {p.planned_end.slice(0,5)}</span></div>)}</div>
    </details>
   </div>
  </div>
 </section>;
}