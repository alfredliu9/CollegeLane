import {env} from "cloudflare:workers";
import {createSession,hashPassword,normalizeEmail,sessionCookie} from "@/lib/auth";

export async function POST(request:Request){
  const body=await request.json().catch(()=>({})) as {email?:string;password?:string};
  const email=normalizeEmail(body.email||""),password=body.password||"";
  const user=await env.DB.prepare("SELECT id,email,password_hash,password_salt FROM users WHERE email=?").bind(email).first<{id:string;email:string;password_hash:string;password_salt:string}>();
  if(!user)return Response.json({error:"Incorrect email or password."},{status:401});
  const candidate=await hashPassword(password,user.password_salt);
  if(candidate.hash!==user.password_hash)return Response.json({error:"Incorrect email or password."},{status:401});
  const session=await createSession(user.id);
  return Response.json({user:{id:user.id,email:user.email}},{headers:{"Set-Cookie":sessionCookie(session.raw,session.maxAge)}});
}
