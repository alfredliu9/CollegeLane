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
