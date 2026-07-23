import {env} from "cloudflare:workers";
import {currentUser} from "@/lib/auth";
import {recommendSchools} from "@/lib/recommendations";
import type {AthleteProfile} from "@/lib/recruiting";

const headers={"Cache-Control":"private, no-store","Content-Type":"application/json"};

export async function GET(request:Request){
  const user=await currentUser(request);
  if(!user)return Response.json({error:"Not signed in."},{status:401,headers});
  const rawLimit=Number(new URL(request.url).searchParams.get("limit")||12);
  const limit=Number.isFinite(rawLimit)?Math.max(1,Math.min(24,Math.floor(rawLimit))):12;
  const row=await env.DB.prepare("SELECT value_json,updated_at FROM user_state WHERE user_id=? AND state_key='cl-athlete'").bind(user.id).first<{value_json:string;updated_at:number}>();
  if(!row)return Response.json({error:"Complete your athlete profile before requesting recommendations."},{status:422,headers});
  let profile:AthleteProfile;
  try{profile=JSON.parse(row.value_json) as AthleteProfile;}catch{return Response.json({error:"Your saved athlete profile could not be read."},{status:422,headers});}
  const response=await recommendSchools(profile,limit);
  return new Response(JSON.stringify({...response,profileUpdatedAt:new Date(row.updated_at*1000).toISOString()}),{headers});
}
