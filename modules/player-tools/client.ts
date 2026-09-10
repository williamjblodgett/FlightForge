export async function toolRequest<T>(url:string, method="GET", input?:unknown):Promise<T> {
  const response=await fetch(url,{method,credentials:"same-origin",cache:"no-store",headers:input===undefined?{}:{"content-type":"application/json"},body:input===undefined?undefined:JSON.stringify(input)});
  const result=await response.json();
  if(!response.ok){const error=result as {error?:{message?:string}};throw new Error(error.error?.message??"Please try again. Your saved records are unchanged.");}
  return result as T;
}
