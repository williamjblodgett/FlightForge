export const OFFLINE_SHELL_VERSION="flightforge-public-assets-v5";
function readiness(worker:ServiceWorker):Promise<boolean>{
  return new Promise(resolve=>{
    const channel=new MessageChannel();
    const finish=(ready:boolean)=>{clearTimeout(timer);channel.port1.close();resolve(ready);};
    const timer=setTimeout(()=>finish(false),1000);
    channel.port1.onmessage=e=>finish(e.data?.version===OFFLINE_SHELL_VERSION&&e.data?.ready===true);
    try{worker.postMessage({type:"OFFLINE_READY"},[channel.port2]);}catch{finish(false);}
  });
}
export async function installOfflineShell(){
  if(!("serviceWorker" in navigator))throw new Error("This browser does not support offline guides.");
  const registration=await navigator.serviceWorker.register("/sw.js",{updateViaCache:"none"});
  const deadline=Date.now()+15000;
  while(Date.now()<deadline){
    const active=registration.active;
    if(active?.state==="activated"&&await readiness(active))return;
    await new Promise(resolve=>setTimeout(resolve,150));
  }
  throw new Error("Offline guide could not finish installing. Stay connected and try again. No download was marked ready.");
}
