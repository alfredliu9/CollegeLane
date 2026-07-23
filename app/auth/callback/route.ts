import {createSession,resolveOrCreateAppUser,sessionCookie} from "@/lib/auth";
import {cookieHeaders,createRequestClient} from "@/lib/supabase/server";

function safeNext(value:string|null,fallback:string){
  return value&&value.startsWith("/")&&!value.startsWith("//")?value:fallback;
}

export async function GET(request:Request){
  const url=new URL(request.url);
  try{
    const code=url.searchParams.get("code");
    if(!code)throw new Error("The sign-in link is missing its authorization code.");
    const {client,pending}=createRequestClient(request);
    const {data,error}=await client.auth.exchangeCodeForSession(code);
    if(error||!data.user?.email)throw error||new Error("A verified email address is required.");
    const user=await resolveOrCreateAppUser({id:data.user.id,email:data.user.email});
    const session=await createSession(user.id);
    const destination=safeNext(url.searchParams.get("next"),user.isNew?"/onboarding":"/dashboard");
    const response=new Response(null,{status:302,headers:{Location:new URL(user.isNew?"/onboarding":destination,request.url).toString()}});
    response.headers.append("Set-Cookie",sessionCookie(session.raw,session.maxAge));
    cookieHeaders(pending).forEach(value=>response.headers.append("Set-Cookie",value));
    response.headers.set("Cache-Control","private, no-store");
    return response;
  }catch(error){
    const destination=new URL("/login",request.url);
    destination.searchParams.set("error",error instanceof Error?error.message:"Unable to complete sign-in.");
    return Response.redirect(destination,302);
  }
}
