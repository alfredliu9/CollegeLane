import {env} from "cloudflare:workers";
import {hashPassword,issueAppSession,normalizeEmail,resolveOrCreateAppUser} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {cookieHeaders,createRequestClient} from "@/lib/supabase/server";

async function migrateLegacyUser(email:string,password:string){
  const legacy=await env.DB.prepare("SELECT id,password_hash,password_salt FROM users WHERE email=?").bind(email).first<{id:string;password_hash:string;password_salt:string}>();
  if(!legacy)return null;
  const candidate=await hashPassword(password,legacy.password_salt);
  if(candidate.hash!==legacy.password_hash)return null;
  const admin=createAdminClient();
  let supabaseUserId="";
  for(let page=1;page<=10&&!supabaseUserId;page++){
    const {data,error}=await admin.auth.admin.listUsers({page,perPage:100});
    if(error)throw error;
    supabaseUserId=data.users.find(user=>normalizeEmail(user.email||"")===email)?.id||"";
    if(data.users.length<100)break;
  }
  if(supabaseUserId){
    const {error}=await admin.auth.admin.updateUserById(supabaseUserId,{password,email_confirm:true});
    if(error)throw error;
  }else{
    const {data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true});
    if(error||!data.user)throw error||new Error("Unable to migrate the account.");
    supabaseUserId=data.user.id;
  }
  return {id:supabaseUserId,email};
}

export async function POST(request:Request){
  try{
    const body=await request.json().catch(()=>({})) as {email?:string;password?:string};
    const email=normalizeEmail(body.email||""),password=body.password||"";
    const {client,pending}=createRequestClient(request);
    let {data,error}=await client.auth.signInWithPassword({email,password});
    if(error||!data.user){
      const migrated=await migrateLegacyUser(email,password);
      if(!migrated)return Response.json({error:"Incorrect email or password."},{status:401});
      ({data,error}=await client.auth.signInWithPassword({email,password}));
    }
    if(error||!data.user?.email)return Response.json({error:"Incorrect email or password."},{status:401});
    const user=await resolveOrCreateAppUser({id:data.user.id,email:data.user.email});
    const response=await issueAppSession(user);
    cookieHeaders(pending).forEach(value=>response.headers.append("Set-Cookie",value));
    return response;
  }catch(error){
    const message=error instanceof Error&&error.message.includes("configured")?error.message:"Account service is temporarily unavailable.";
    return Response.json({error:message},{status:503});
  }
}
