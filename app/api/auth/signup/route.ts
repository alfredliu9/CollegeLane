import {env} from "cloudflare:workers";
import {createSession,hashPassword,normalizeEmail,sessionCookie} from "@/lib/auth";

export async function POST(request:Request){
  const body=await request.json().catch(()=>({})) as {email?:string;password?:string;lastName?:string};
  const email=normalizeEmail(body.email||""),password=body.password||"",lastName=(body.lastName||"").trim();
  if(lastName.length<1||lastName.length>80)return Response.json({error:"Enter your last name."},{status:400});
  if(!/^\S+@\S+\.\S+$/.test(email))return Response.json({error:"Enter a valid email address."},{status:400});
  if(password.length<8)return Response.json({error:"Password must be at least 8 characters."},{status:400});
  const existing=await env.DB.prepare("SELECT id FROM users WHERE email=?").bind(email).first();
  if(existing)return Response.json({error:"An account with that email already exists."},{status:409});
  const id=crypto.randomUUID(),now=Math.floor(Date.now()/1000),credentials=await hashPassword(password);
  await env.DB.prepare("INSERT INTO users (id,email,last_name,password_hash,password_salt,created_at) VALUES (?,?,?,?,?,?)").bind(id,email,lastName,credentials.hash,credentials.salt,now).run();
  const session=await createSession(id);
  return Response.json({user:{id,email,lastName}},{status:201,headers:{"Set-Cookie":sessionCookie(session.raw,session.maxAge)}});
}
