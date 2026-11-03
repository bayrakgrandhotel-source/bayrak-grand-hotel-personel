type ShiftRow={work_date:string;check_in:string;check_out:string|null};
type AdvanceRow={advance_date:string;amount:number;note:string|null};
type LeaveRow={leave_date:string;note:string|null};
export type MonthlyExport={name:string;month:string;shifts:ShiftRow[];advances:AdvanceRow[];daysOff:LeaveRow[]};
const dateTR=(date:string)=>date.slice(0,10).split("-").reverse().join(".");
const timeTR=(date:string|null)=>date?new Date(date).toLocaleString("tr-TR",{timeZone:"Europe/Istanbul",hour:"2-digit",minute:"2-digit",hour12:false}):"";
const hours=(s:ShiftRow)=>s.check_out?Math.max(0,(new Date(s.check_out).getTime()-new Date(s.check_in).getTime())/3600000):0;
export async function downloadMonthlyExcel(data:MonthlyExport){
 const ExcelJS=await import("exceljs");
 const wb=new ExcelJS.Workbook();
 wb.creator="Bayrak Grand Hotel";
 wb.created=new Date();
 const name=data.name.trim();
 const monthLabel=new Intl.DateTimeFormat("tr-TR",{month:"long",year:"numeric",timeZone:"UTC"}).format(new Date(data.month+"-01T12:00:00Z"));
 const navy="211910",gold="D4AE74",light="F3E8D8";
 function sheet(title:string,headers:string[],widths:number[]){
   const ws=wb.addWorksheet(title);
   ws.columns=widths.map((width)=>({width}));
   ws.mergeCells(1,1,1,headers.length);
   const header=ws.getCell(1,1);header.value="BAYRAK GRAND HOTEL · AYLIK PERSONEL RAPORU";
   header.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF"+navy}};
   header.font={bold:true,color:{argb:"FF"+gold},size:15};
   header.alignment={vertical:"middle",horizontal:"center"};
   ws.getRow(1).height=30;
   ws.mergeCells(2,1,2,headers.length);
   ws.getCell(2,1).value=name+" · "+monthLabel.toLocaleUpperCase("tr-TR")+" · "+title;
   ws.getCell(2,1).font={bold:true,color:{argb:"FF"+navy},size:12};
   ws.getRow(2).height=25;
   const row=ws.getRow(4); row.values=[, ...headers];
   row.height=24;
   row.eachCell(cell=>{cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF"+navy}};cell.font={bold:true,color:{argb:"FF"+gold}};cell.alignment={vertical:"middle"}});
   ws.views=[{state:"frozen",ySplit:4}];
   ws.pageSetup={fitToPage:true,fitToWidth:1,fitToHeight:0};
   return ws;
 }
 const advance=sheet("Avanslar",["Tarih","Tutar (₺)","Açıklama"],[16,20,46]);
 const sortedAdvances=[...data.advances].sort((a,b)=>a.advance_date.localeCompare(b.advance_date));
 for(const a of sortedAdvances){
   const row=advance.addRow([dateTR(a.advance_date),Number(a.amount),a.note||""]);
   row.getCell(2).numFmt='"₺"#,##0.00';
 }
 const advTotalRow=Math.max(5,advance.rowCount+2);
 advance.getCell("A"+advTotalRow).value="TOPLAM AVANS";
 advance.getCell("A"+advTotalRow).font={bold:true};
 const total=sortedAdvances.reduce((sum,a)=>sum+Number(a.amount),0);
 advance.getCell("B"+advTotalRow).value={formula:"SUM(B5:B"+Math.max(5,advance.rowCount-2)+")",result:total};
 advance.getCell("B"+advTotalRow).numFmt='"₺"#,##0.00';
 advance.getCell("B"+advTotalRow).font={bold:true};
 const shiftSheet=sheet("Mesai",["Tarih","Giriş","Çıkış","Süre (saat)","Durum"],[17,16,16,19,22]);
 const sortedShifts=[...data.shifts].sort((a,b)=>a.check_in.localeCompare(b.check_in));
 for(const s of sortedShifts){
   const row=shiftSheet.addRow([dateTR(s.work_date),timeTR(s.check_in),timeTR(s.check_out),s.check_out?Math.round(hours(s)*100)/100:null,s.check_out?"Tamamlandı":"Çıkış bekleniyor"]);
   row.getCell(4).numFmt="0.00";
 }
 const hoursTotal=sortedShifts.reduce((sum,s)=>sum+hours(s),0);
 const shiftTotalRow=Math.max(5,shiftSheet.rowCount+2);
 shiftSheet.getCell("C"+shiftTotalRow).value="TOPLAM SAAT";
 shiftSheet.getCell("C"+shiftTotalRow).font={bold:true};
 shiftSheet.getCell("D"+shiftTotalRow).value={formula:"SUM(D5:D"+Math.max(5,shiftSheet.rowCount-2)+")",result:Math.round(hoursTotal*100)/100};
 shiftSheet.getCell("D"+shiftTotalRow).numFmt="0.00";
 shiftSheet.getCell("D"+shiftTotalRow).font={bold:true};
 const leave=sheet("İzinler",["İzin Tarihi","Açıklama"],[18,55]);
 for(const d of [...data.daysOff].sort((a,b)=>a.leave_date.localeCompare(b.leave_date)))leave.addRow([dateTR(d.leave_date),d.note||""]);
 const overview=sheet("Özet",["Açıklama","Değer"],[35,26]);
 const summaries=[
  ["Personel",name],
  ["Ay",monthLabel],
  ["Avans adedi",sortedAdvances.length],
  ["Toplam avans (₺)",{formula:"SUM(Avanslar!B5:B"+Math.max(5,advTotalRow-2)+")",result:total}],
  ["Mesai kayıt adedi",sortedShifts.length],
  ["Tamamlanan mesai",sortedShifts.filter(s=>!!s.check_out).length],
  ["Toplam çalışma saati",{formula:"SUM(Mesai!D5:D"+Math.max(5,shiftTotalRow-2)+")",result:Math.round(hoursTotal*100)/100}],
  ["İzin günü",data.daysOff.length]
 ];
 for(const [i,entry] of summaries.entries()){
   const row=overview.getRow(5+i);row.getCell(1).value=entry[0] as string;row.getCell(2).value=entry[1] as string|number|{formula:string;result:number};
   row.getCell(1).font={bold:true,color:{argb:"FF"+navy}};
   if(i%2===0)row.eachCell(cell=>cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF"+light}});
 }
 overview.getCell("B8").numFmt='"₺"#,##0.00';
 overview.getCell("B11").numFmt="0.00";
 const buffer=await wb.xlsx.writeBuffer();
 const file=new Blob([new Uint8Array(buffer)],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
 const url=URL.createObjectURL(file);
 const a=document.createElement("a");a.href=url;
 a.download="Bayrak_Grand_Hotel_"+name.replace(/[^A-Za-z0-9ğüşıöçĞÜŞİÖÇ_-]/g,"_")+"_"+data.month+".xlsx";
 document.body.appendChild(a);a.click();a.remove();
 window.setTimeout(()=>URL.revokeObjectURL(url),3000);
}