"use client";
import {useEffect,useState} from "react";

type Theme="light"|"dark";
const KEY="bayrak-grand-hotel-color-mode";

function readTheme():Theme{
 try{return window.localStorage.getItem(KEY)==="dark"?"dark":"light"}catch{return "light"}
}
function applyTheme(theme:Theme){
 document.documentElement.setAttribute("data-bgh-theme",theme);
 document.documentElement.style.colorScheme=theme;
 try{window.localStorage.setItem(KEY,theme)}catch{}
 window.dispatchEvent(new Event("bayrak-theme-changed"));
}

export default function ThemeToggle({compact=false,english=false}:{compact?:boolean;english?:boolean}){
 const [theme,setTheme]=useState<Theme>("light");
 useEffect(()=>{
  const sync=()=>setTheme(readTheme());
  sync();
  // Keep tabs/screens in this browser consistent with one selected color mode.
  window.addEventListener("bayrak-theme-changed",sync);
  window.addEventListener("storage",sync);
  return()=>{window.removeEventListener("bayrak-theme-changed",sync);window.removeEventListener("storage",sync)};
 },[]);
 const change=(next:Theme)=>{applyTheme(next);setTheme(next)};
 return <div className={"bgh-theme-switch "+(compact?"bgh-theme-switch-compact":"")}>
  {!compact&&<div className="bgh-theme-heading">{english?"Appearance":"Görünüm"}</div>}
  <div className="bgh-theme-options" role="group" aria-label={english?"Color mode":"Renk modu"}>
   <button type="button" className={theme==="light"?"bgh-theme-option selected":"bgh-theme-option"} aria-pressed={theme==="light"} onClick={()=>change("light")}><span aria-hidden="true">☀</span> {english?"Light":"Beyaz"}</button>
   <button type="button" className={theme==="dark"?"bgh-theme-option selected":"bgh-theme-option"} aria-pressed={theme==="dark"} onClick={()=>change("dark")}><span aria-hidden="true">☾</span> {english?"Dark":"Siyah"}</button>
  </div>
 </div>;
}
