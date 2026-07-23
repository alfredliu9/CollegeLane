import {env} from "cloudflare:workers";

const encoder=new TextEncoder();
const SESSION_COOKIE="collegelane_session";
const SESSION_SECONDS=60*60*24*30;

function bytesToBase64(bytes:Uint8Array){return btoa(String.fromCharCode(...bytes));}
function base64ToBytes(value:string){return Uint8Array.from(atob(value),c=>c.charCodeAt(0));}

export function normalizeEmail(value:string){return value.trim().toLowerCase();}

export async function hashPassword(password:string,salt?:string){
  const saltBytes=salt?base64ToBytes(salt):crypto.getRandomValues(new Uint8Array(16));
  const key=await crypto.subtle.importKey("raw",encoder.encode(password),"PBKDF2",false,["deriveBits"]);
  const bits=await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt:saltBytes,iterations:100000},key,256);
  return {hash:bytesToBase64(new Uint8Array(bits)),salt:bytesToBase64(saltBytes)};
}

async function sha256(value:string){
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256",encoder.encode(value)))].map(x=>x.toString(16).padStart(2,"0")).join("");
}

export async function createSession(userId:string){
  const raw=bytesToBase64(crypto.getRandomValues(new Uint8Array(32))).replaceAll("+","-").replaceAll("/","_").replaceAll("=","");
  const now=Math.floor(Date.now()/1000),expiresAt=now+SESSION_SECONDS;
  await env.DB.prepare("INSERT INTO sessions (token_hash,user_id,expires_at,created_at) VALUES (?,?,?,?)").bind(await sha256(raw),userId,expiresAt,now).run();
  return {raw,maxAge:SESSION_SECONDS};
}

export function sessionCookie(raw:string,maxAge:number){
  return `${SESSION_COOKIE}=${raw}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearSessionCookie(){return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;}

function cookieValue(request:Request){
  const match=request.headers.get("cookie")?.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
  return match?.[1]||"";
}

export async function currentUser(request:Request){
  const raw=cookieValue(request); if(!raw)return null;
  const now=Math.floor(Date.now()/1000);
  const row=await env.DB.prepare("SELECT users.id,users.email,users.last_name AS lastName FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.token_hash=? AND sessions.expires_at>?").bind(await sha256(raw),now).first<{id:string;email:string;lastName:string}>();
  return row||null;
}

export async function deleteCurrentSession(request:Request){
  const raw=cookieValue(request); if(raw)await env.DB.prepare("DELETE FROM sessions WHERE token_hash=?").bind(await sha256(raw)).run();
}

type VerifiedIdentity={id:string;email?:string|null};

export async function resolveOrCreateAppUser(identity:VerifiedIdentity){
  const email=normalizeEmail(identity.email||"");
  if(!identity.id||!/^\S+@\S+\.\S+$/.test(email))throw new Error("A verified email address is required.");
  const linked=await env.DB.prepare("SELECT users.id,users.email,users.last_name AS lastName FROM auth_identities JOIN users ON users.id=auth_identities.user_id WHERE auth_identities.provider=? AND auth_identities.provider_subject=?").bind("supabase",identity.id).first<{id:string;email:string;lastName:string}>();
  if(linked)return {...linked,isNew:false};
  const existing=await env.DB.prepare("SELECT id,email,last_name AS lastName FROM users WHERE email=?").bind(email).first<{id:string;email:string;lastName:string}>();
  const now=Math.floor(Date.now()/1000);
  const user=existing||{id:crypto.randomUUID(),email,lastName:""};
  if(!existing){
    const unavailable=await hashPassword(bytesToBase64(crypto.getRandomValues(new Uint8Array(32))));
    await env.DB.prepare("INSERT INTO users (id,email,last_name,password_hash,password_salt,created_at) VALUES (?,?,?,?,?,?)").bind(user.id,email,"",unavailable.hash,unavailable.salt,now).run();
  }
  await env.DB.prepare("INSERT INTO auth_identities (provider,provider_subject,user_id,email,created_at) VALUES (?,?,?,?,?) ON CONFLICT(provider,provider_subject) DO UPDATE SET user_id=excluded.user_id,email=excluded.email").bind("supabase",identity.id,user.id,email,now).run();
  return {...user,isNew:!existing};
}

export async function issueAppSession(user:{id:string;email:string;lastName?:string},status=200){
  const session=await createSession(user.id);
  return Response.json({user:{id:user.id,email:user.email,lastName:user.lastName||""}},{status,headers:{"Set-Cookie":sessionCookie(session.raw,session.maxAge),"Cache-Control":"private, no-store"}});
}
