"use client";
import {useEffect,useState} from "react";
import type {SupabaseClient} from "@supabase/supabase-js";
type Request={id:string;staff_id:string;leave_date:string;reason:string;status:string;created_at:string};
export default function ManagerLeaveRequests({sb,names}:{sb:SupabaseClient;names:Record<string,string>}){
 const [requests,setRequests]=useState<Request[]>([]);
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const [reload,setReload]=useState(0);
 useEffect(()=>{let active=true;sb.from("hotel_leave_requests").select("id,staff_id,leave_date,reason,status,created_at").order("created_at",{ascending:false}).limit(300).then(({data,error})=>{if(!active)return;if(error)setError(error.message);else setRequests(data||[])});return()=>{active=false}},[sb,reload]);
 async function decide(id:string,status:"approved"|"rejected"){if(busy)return;setBusy(true);setError("");setNotice("");try{const {error}=await sb.rpc("hotel_review_leave_request",{p_request_id:id,p_new_status:status});if(error)throw error;setReload(v=>v+1);setNotice(status==="approved"?"İzin onaylandı ve izin kayıtlarına eklendi.":"İzin talebi reddedildi.")}catch(e){setError(e instanceof Error?e.message:"İşlem başarısız")}finally{setBusy(false)}}
 const pending=requests.filter(r=>r.status==="pending");
 return <section className="panel"><h2>Personel İzin Talepleri {pending.length>0&&<span className="notifications-unread">{pending.length} bekleyen</span>}</h2><p className="muted">Personellerin gönderdiği izin taleplerini buradan onaylayabilir veya reddedebilirsiniz.</p>
 {error&&<p className="error">{error}</p>}{notice&&<p className="success">{notice}</p>}
 {requests.length===0?<p className="muted">Henüz izin talebi bulunmuyor.</p>:requests.map(r=><div className="row" key={r.id}><div><b>{names[r.staff_id]||"Personel"}</b><p>{r.leave_date.split("-").reverse().join(".")} · {r.reason}</p><p className="muted">{r.status==="pending"?"Beklemede":r.status==="approved"?"Onaylandı":"Reddedildi"}</p></div>{r.status==="pending"&&<div className="actions"><button disabled={busy} onClick={()=>void decide(r.id,"approved")}>Onayla</button><button className="danger" disabled={busy} onClick={()=>void decide(r.id,"rejected")}>Reddet</button></div>}</div>)}
 </section>;
}
