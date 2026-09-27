"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import {toolRequest,ToolRequestError} from "@/modules/player-tools/client";

// Only the latest read may update the screen. Cancelling a read never cancels a write.
export function useToolResource<T>(url:string|null) {
  const [snapshot,setSnapshot]=useState<{url:string;data:T}|null>(null);
  const [loading,setLoading]=useState(Boolean(url));
  const [error,setError]=useState("");
  const [errorStatus,setErrorStatus]=useState(0);
  const request=useRef<{id:number;controller?:AbortController}>({id:0});
  const handleAuthFailure=useCallback((failure:unknown)=>{
    if(!(failure instanceof ToolRequestError)||failure.status!==401)return false;
    request.current.id++;request.current.controller?.abort();
    setSnapshot(null);setLoading(false);setErrorStatus(401);setError(failure.message);
    return true;
  },[]);
  const refresh=useCallback(async()=>{
    request.current.controller?.abort();
    const id=++request.current.id;
    if(!url){setLoading(false);setError("");return false;}
    const controller=new AbortController();request.current.controller=controller;
    setLoading(true);setError("");setErrorStatus(0);
    try {
      const data=await toolRequest<T>(url,"GET",undefined,controller.signal);
      if(id!==request.current.id)return false;
      setSnapshot({url,data});return true;
    } catch(e) {
      if(id===request.current.id&&!controller.signal.aborted){
        const status=e instanceof ToolRequestError?e.status:0;
        setErrorStatus(status);
        if(status===401||status===403||status===404)setSnapshot(null);
        setError(e instanceof Error?e.message:"Could not load your information.");
      }
      return false;
    } finally {if(id===request.current.id)setLoading(false);}
  },[url]);
  useEffect(()=>{
    const active=request.current;
    // The effect starts an external read; its loading state must also track URL changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    return()=>{active.id++;active.controller?.abort();};
  },[refresh]);
  const data=snapshot?.url===url?snapshot.data:null;
  return {data,loading,error,errorStatus,ready:Boolean(data)&&!loading&&!error,refresh,handleAuthFailure};
}
