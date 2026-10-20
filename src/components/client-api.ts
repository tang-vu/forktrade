export async function api<T>(path:string,body?:unknown,csrf?:string):Promise<T> {
  const response=await fetch(`/api/${path}`,{method:body===undefined?'GET':'POST',cache:'no-store',credentials:'same-origin',headers:{'Content-Type':'application/json',...(csrf?{'x-csrf-token':csrf}:{})},body:body===undefined?undefined:JSON.stringify(body)});
  const data=await response.json();if(!response.ok)throw new Error(data.error || 'Operation unavailable');return data as T;
}
