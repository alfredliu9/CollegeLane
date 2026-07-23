import {createServerClient,type CookieOptions} from "@supabase/ssr";
import {supabaseConfig} from "./config";

type PendingCookie={name:string;value:string;options:CookieOptions};

function parseCookies(request:Request){
  return (request.headers.get("cookie")||"").split(";").map(value=>value.trim()).filter(Boolean).map(pair=>{
    const separator=pair.indexOf("=");
    return {name:separator<0?pair:pair.slice(0,separator),value:separator<0?"":decodeURIComponent(pair.slice(separator+1))};
  });
}

export function createRequestClient(request:Request){
  const {url,publishableKey}=supabaseConfig();
  const pending:PendingCookie[]=[];
  const initial=parseCookies(request);
  const client=createServerClient(url,publishableKey,{
    cookies:{
      getAll(){return initial;},
      setAll(values){pending.push(...values);},
    },
  });
  return {client,pending};
}

export function cookieHeaders(pending:PendingCookie[]){
  return pending.map(({name,value,options})=>{
    const parts=[`${name}=${encodeURIComponent(value)}`];
    if(options.maxAge!==undefined)parts.push(`Max-Age=${options.maxAge}`);
    if(options.domain)parts.push(`Domain=${options.domain}`);
    parts.push(`Path=${options.path||"/"}`);
    if(options.httpOnly)parts.push("HttpOnly");
    if(options.secure!==false)parts.push("Secure");
    if(options.sameSite)parts.push(`SameSite=${typeof options.sameSite==="string"?options.sameSite:"Lax"}`);
    return parts.join("; ");
  });
}
