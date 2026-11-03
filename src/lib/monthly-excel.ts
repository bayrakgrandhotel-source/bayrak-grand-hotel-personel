type ShiftRow={work_date:string;check_in:string;check_out:string|null};
type AdvanceRow={advance_date:string;amount:number;note:string|null};
type LeaveRow={leave_date:string;note:string|null};
export type MonthlyExport={name:string;month:string;shifts:ShiftRow[];advances:AdvanceRow[];daysOff:LeaveRow[]};
const dateTR=(d:string)=>d.slice(0,10).split("-").reverse().join(".");
const timeTR=(d:string|null)=>d?new Date(d).toLocaleTimeString("tr-TR",{timeZone:"Europe/Istanbul",hour:"2-digit",minute:"2-digit",hour12:false}):"—";
const workHours=(s:ShiftRow)=>s.check_out?Math.max(0,(new Date(s.check_out).getTime()-new Date(s.check_in).getTime())/3600000):0;

export async function downloadMonthlyExcel(data:MonthlyExport){
 const {default:ExcelJS}=await import("exceljs");
 const wb=new ExcelJS.Workbook();wb.creator="Bayrak Grand Hotel";wb.created=new Date();
 const ink="241B14",gold="D6B27C",pale="F5EBDD";
 const monthStart=new Date(data.month+"-01T12:00:00Z");
 const monthLabel=new Intl.DateTimeFormat("tr-TR",{month:"long",year:"numeric",timeZone:"UTC"}).format(monthStart);
 const shifts=[...data.shifts].sort((a,b)=>a.check_in.localeCompare(b.check_in));
 const advances=[...data.advances].sort((a,b)=>a.advance_date.localeCompare(b.advance_date));
 const leaves=[...data.daysOff].sort((a,b)=>a.leave_date.localeCompare(b.leave_date));
 const total=advances.reduce((n,a)=>n+Number(a.amount),0);
 const totalHours=shifts.reduce((n,s)=>n+workHours(s),0);
 const excelMoney='"₺"#,##0.00';
 function sheet(title:string,columns:{header:string;key:string;width:number}[]){
   const ws=wb.addWorksheet(title);ws.columns=columns;ws.mergeCells(1,1,1,columns.length);
   ws.getCell("A1").value="BAYRAK GRAND HOTEL | AYLIK PERSONEL RAPORU";
   ws.getCell("A1").fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF"+ink}};
   ws.getCell("A1").font={name:"Calibri",bold:true,size:14,color:{argb:"FF"+gold}};
   ws.getCell("A1").alignment={vertical:"middle",horizontal:"center"};ws.getRow(1).height=34;
   ws.mergeCells(2,1,2,columns.length);ws.getCell("A2").value=data.name+" | "+monthLabel.toLocaleUpperCase("tr-TR")+" | "+title;
   ws.getCell("A2").font={bold:true,color:{argb:"FF"+ink}};ws.getRow(2).height=25;
   ws.getRow(4).values=[, ...columns.map(c=>c.header)];
   const header=ws.getRow(4);header.height=24;
   header.eachCell(c=>{c.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF"+ink}};c.font={bold:true,color:{argb:"FF"+gold}};c.alignment={vertical:"middle"}});
   ws.views=[{state:"frozen",ySplit:4}];ws.pageSetup={fitToPage:true,fitToWidth:1,fitToHeight:0};return ws;
 }
 // Put the daily register FIRST: this is what Excel shows when opened.
 const overview=sheet("Aylık Özet",[
 {header:"Tarih",key:"date",width:17},{header:"Giriş",key:"entry",width:15},{header:"Çıkış",key:"exit",width:15},
 {header:"Çalışma (sa)",key:"duration",width:18},{header:"Durum",key:"state",width:23}
 ]);
 const rowsByDay=new Map<string,ShiftRow[]>();
 for(const s of shifts){const rows=rowsByDay.get(s.work_date)||[];rows.push(s);rowsByDay.set(s.work_date,rows)}
 const count=new Date(Date.UTC(monthStart.getUTCFullYear(),monthStart.getUTCMonth()+1,0)).getUTCDate();
 for(let day=1;day<=count;day++){
   const iso=data.month+"-"+String(day).padStart(2,"0");
   const entries=rowsByDay.get(iso)||[];
   if(entries.length===0){overview.addRow({date:dateTR(iso),entry:"—",exit:"—",duration:null,state:"Kayıt yok"});continue;}
   for(const s of entries){
     const row=overview.addRow({date:dateTR(iso),entry:timeTR(s.check_in),exit:timeTR(s.check_out),duration:s.check_out?Math.round(workHours(s)*100)/100:null,state:s.check_out?"Tamamlandı":"Çıkış bekleniyor"});
     row.getCell(4).numFmt="0.00";
   }
 }
 const sumRow=overview.rowCount+2;
 overview.getCell("C"+sumRow).value="TOPLAM ÇALIŞMA";
 overview.getCell("D"+sumRow).value=Math.round(totalHours*100)/100;overview.getCell("D"+sumRow).numFmt="0.00";
 for(const cell of [overview.getCell("C"+sumRow),overview.getCell("D"+sumRow)])cell.font={bold:true,color:{argb:"FF"+ink}};
 const statsAt=sumRow+3;
 const summary:[string,string|number][]=[
  ["Personel",data.name],["Ay",monthLabel],["Mesai kaydı",shifts.length],
  ["Tamamlanan mesai",shifts.filter(s=>!!s.check_out).length],
  ["Toplam çalışma saati",Math.round(totalHours*100)/100],
  ["Avans sayısı",advances.length],["Toplam avans (₺)",total],["İzin günü",leaves.length]
 ];
 for(let i=0;i<summary.length;i++){
   const row=overview.getRow(statsAt+i);row.getCell(1).value=summary[i][0];row.getCell(2).value=summary[i][1];
   row.getCell(1).font={bold:true,color:{argb:"FF"+ink}};
   if(i%2===0)row.eachCell(c=>c.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF"+pale}});
 }
 overview.getCell("B"+(statsAt+6)).numFmt=excelMoney;
 const clock=sheet("Giriş Çıkışlar",[
 {header:"Tarih",key:"date",width:17},{header:"Giriş",key:"entry",width:17},{header:"Çıkış",key:"exit",width:17},
 {header:"Çalışma (saat)",key:"duration",width:21},{header:"Durum",key:"state",width:22}
 ]);
 for(const s of shifts){
   const row=clock.addRow({date:dateTR(s.work_date),entry:timeTR(s.check_in),exit:timeTR(s.check_out),duration:s.check_out?Math.round(workHours(s)*100)/100:null,state:s.check_out?"Tamamlandı":"Çıkış bekleniyor"});
   row.getCell(4).numFmt="0.00";
 }
 const clockSum=clock.rowCount+2;clock.getCell("C"+clockSum).value="TOPLAM SAAT";clock.getCell("D"+clockSum).value=Math.round(totalHours*100)/100;clock.getCell("D"+clockSum).numFmt="0.00";clock.getCell("D"+clockSum).font={bold:true};
 const adv=sheet("Avanslar",[{header:"Tarih",key:"date",width:18},{header:"Tutar (₺)",key:"amount",width:22},{header:"Açıklama",key:"note",width:48}]);
 for(const a of advances){const row=adv.addRow({date:dateTR(a.advance_date),amount:Number(a.amount),note:a.note||""});row.getCell(2).numFmt=excelMoney;}
 const advSum=adv.rowCount+2;adv.getCell("A"+advSum).value="TOPLAM AVANS";adv.getCell("B"+advSum).value=total;adv.getCell("B"+advSum).numFmt=excelMoney;adv.getCell("A"+advSum).font={bold:true};adv.getCell("B"+advSum).font={bold:true};
 const leave=sheet("İzinler",[{header:"Tarih",key:"date",width:19},{header:"Açıklama",key:"note",width:52}]);
 for(const d of leaves)leave.addRow({date:dateTR(d.leave_date),note:d.note||""});
 const buf=await wb.xlsx.writeBuffer();
 const file=new Blob([new Uint8Array(buf)],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
 const url=URL.createObjectURL(file);const link=document.createElement("a");
 link.href=url;link.download="Bayrak_Grand_Hotel_"+data.name.replace(/[^A-Za-z0-9ğüşıöçĞÜŞİÖÇ_-]/g,"_")+"_"+data.month+".xlsx";
 document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);
}