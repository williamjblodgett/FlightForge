"use client";
import {useEffect,useRef,useState} from "react";
import QRCode from "qrcode";
export function QrLink({url,label}:{url:string;label:string}) {
  const canvas=useRef<HTMLCanvasElement>(null),[message,setMessage]=useState("");
  useEffect(()=>{if(canvas.current)void QRCode.toCanvas(canvas.current,url,{width:224,margin:4,errorCorrectionLevel:"M"}).catch(()=>setMessage("QR could not be drawn. Use the link instead."));},[url]);
  return <div className="qr-link"><canvas ref={canvas} role="img" aria-label={label}/><a href={url}>{label}</a><button onClick={()=>void navigator.clipboard.writeText(url).then(()=>setMessage("Link copied.")).catch(()=>setMessage("Select and copy the link manually."))}>Copy link</button><p role="status">{message}</p></div>;
}
