import type {EmailOtpType} from "@supabase/supabase-js";
import {createSession,resolveOrCreateAppUser,sessionCookie} from "@/lib/auth";
import {cookieHeaders,createRequestClient} from "@/lib/supabase/server";

export async function GET(request:Request){
  const url=new URL(request.url);
  try{
    const token_hash=url.searchParams.get("token_hash");
    const type=url.searchParams.get("type") as EmailOtpType|null;
    if(!token_hash||!type)throw new Error("The confirmation link is incomplete.");
    const {client,pending}=createRequestClient(request);
    const {data,error}=await client.auth.verifyOtp({token_hash,type});
    if(error||!data.user?.email)throw error||new Error("Unable to confirm the email address.");
    const user=await resolveOrCreateAppUser({id:data.user.id,email:data.user.email});
    const session=await createSession(user.id);
    const response=Response.redirect(new URL(user.isNew?"/onboarding":"/dashboard",request.url),302);
    response.headers.append("Set-Cookie",sessionCookie(session.raw,session.maxAge));
    cookieHeaders(pending).forEach(value=>response.headers.append("Set-Cookie",value));
    response.headers.set("Cache-Control","private, no-store");
    return response;
  }catch(error){
    const destination=new URL("/login",request.url);
    destination.searchParams.set("error",error instanceof Error?error.message:"Unable to confirm the email address.");
    return Response.redirect(destination,302);
  }
}
