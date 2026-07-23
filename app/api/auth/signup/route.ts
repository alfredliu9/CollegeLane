import {issueAppSession,normalizeEmail,resolveOrCreateAppUser} from "@/lib/auth";
import {cookieHeaders,createRequestClient} from "@/lib/supabase/server";

export async function POST(request:Request){
  try{
    const body=await request.json().catch(()=>({})) as {email?:string;password?:string};
    const email=normalizeEmail(body.email||""),password=body.password||"";
    if(!/^\S+@\S+\.\S+$/.test(email))return Response.json({error:"Enter a valid email address."},{status:400});
    if(password.length<8)return Response.json({error:"Password must be at least 8 characters."},{status:400});
    const {client,pending}=createRequestClient(request);
    const redirectTo=new URL("/auth/callback",request.url).toString();
    const {data,error}=await client.auth.signUp({email,password,options:{emailRedirectTo:redirectTo}});
    if(error)return Response.json({error:error.message||"Unable to create the account."},{status:400});
    if(!data.session||!data.user?.email){
      const response=Response.json({requiresEmailConfirmation:true,email},{status:202,headers:{"Cache-Control":"private, no-store"}});
      cookieHeaders(pending).forEach(value=>response.headers.append("Set-Cookie",value));
      return response;
    }
    const user=await resolveOrCreateAppUser({id:data.user.id,email:data.user.email});
    const response=await issueAppSession(user,201);
    cookieHeaders(pending).forEach(value=>response.headers.append("Set-Cookie",value));
    return response;
  }catch(error){
    const message=error instanceof Error&&error.message.includes("configured")?error.message:"Account service is temporarily unavailable.";
    return Response.json({error:message},{status:503});
  }
}
