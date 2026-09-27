export class ToolRequestError extends Error {
  constructor(message:string, readonly status:number) { super(message); }
}
export async function toolRequest<T>(url:string, method="GET", input?:unknown, signal?:AbortSignal):Promise<T> {
  let response:Response;
  try {
    response=await fetch(url,{method,signal,credentials:"same-origin",cache:"no-store",headers:input===undefined?{}:{"content-type":"application/json"},body:input===undefined?undefined:JSON.stringify(input)});
  } catch(error) {
    if(signal?.aborted)throw error;
    throw new ToolRequestError("Could not connect. Check your connection and refresh before submitting another change.",0);
  }
  const result:unknown=await response.json().catch(()=>null);
  if(!response.ok){const error=result as {error?:{message?:string}}|null;throw new ToolRequestError(error?.error?.message??"This request could not finish. Refresh before trying again.",response.status);}
  if(result===null)throw new ToolRequestError("The response could not be read. Refresh to check your saved information.",response.status);
  return result as T;
}
