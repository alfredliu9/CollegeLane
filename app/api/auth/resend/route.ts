import {normalizeEmail} from "@/lib/auth";
import {cookieHeaders,createRequestClient} from "@/lib/supabase/server";

function readableAuthError(error:{message?:unknown;code?:string}){
  const message=typeof error.message==="string"?error.message.trim():"";
  if(message&&message!=="{}")return message;
  if(error.code==="over_email_send_rate_limit")return "Please wait a minute before requesting another email.";
  return "The confirmation email could not be sent. Please try again.";
}

export async function POST(request:Request){
  try{
    const body=await request.json().catch(()=>({})) as {email?:string};
    const email=normalizeEmail(body.email||"");
    if(!/^\S+@\S+\.\S+$/.test(email))return Response.json({error:"Enter a valid email address."},{status:400});

    const {client,pending}=createRequestClient(request);
    const emailRedirectTo=new URL("/auth/callback",request.url).toString();
    const {error}=await client.auth.resend({type:"signup",email,options:{emailRedirectTo}});
    if(error)return Response.json({error:readableAuthError(error)},{status:error.status||400});

    const response=Response.json({sent:true,email},{status:200,headers:{"Cache-Control":"private, no-store"}});
    cookieHeaders(pending).forEach(value=>response.headers.append("Set-Cookie",value));
    return response;
  }catch{
    return Response.json({error:"The confirmation email could not be sent. Please try again."},{status:503});
  }
}
