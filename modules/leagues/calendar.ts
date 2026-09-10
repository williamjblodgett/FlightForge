export function weeklyStarts(startsAt:string,timeZone:string,weeks:number):string[] {
  const format=new Intl.DateTimeFormat("en-CA",{timeZone,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"});
  const parts=(date:Date)=>Object.fromEntries(format.formatToParts(date).filter(p=>p.type!=="literal").map(p=>[p.type,Number(p.value)]));
  const first=parts(new Date(startsAt));
  return Array.from({length:weeks},(_,i)=>{
    const local=Date.UTC(first.year,first.month-1,first.day+7*i,first.hour,first.minute,first.second);
    let guess=local;
    for(let n=0;n<4;n++){const p=parts(new Date(guess));guess+=local-Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second);}
    const p=parts(new Date(guess));
    if(Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second)!==local)throw new Error("A recurring time falls in a daylight-saving clock gap. Choose another starting time.");
    return new Date(guess).toISOString();
  });
}
export function calendarText(events:Array<{id:string;title:string;venue:string;startsAt:string;endsAt:string;status:string;version:number}>) {
  const escape=(s:string)=>s.replaceAll("\\","\\\\").replace(/\r?\n/g,"\\n").replaceAll(",","\\,").replaceAll(";","\\;");
  const stamp=(s:string)=>new Date(s).toISOString().replace(/[-:]/g,"").replace(/\.\d{3}Z$/,"Z");
  return ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//FlightForge//League companion//EN","CALSCALE:GREGORIAN",...events.flatMap(e=>["BEGIN:VEVENT",`UID:${e.id}@flightforge`,`SEQUENCE:${e.version}`,`DTSTAMP:${stamp(new Date().toISOString())}`,`DTSTART:${stamp(e.startsAt)}`,`DTEND:${stamp(e.endsAt)}`,`SUMMARY:${escape(e.title)}`,`LOCATION:${escape(e.venue)}`,`STATUS:${e.status==="CANCELLED"?"CANCELLED":"CONFIRMED"}`,"BEGIN:VALARM","TRIGGER:-PT1H","ACTION:DISPLAY","DESCRIPTION:League round reminder","END:VALARM","END:VEVENT"]),"END:VCALENDAR",""].join("\r\n");
}
