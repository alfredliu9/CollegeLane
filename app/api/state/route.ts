import {env} from "cloudflare:workers";
import {currentUser} from "@/lib/auth";

function validKey(key:string){return key.length>0&&key.length<=100&&/^[a-zA-Z0-9:_-]+$/.test(key);}

export async function GET(request:Request){
  const user=await currentUser(request);
  if(!user)return Response.json({error:"Not signed in."},{status:401});
  const key=new URL(request.url).searchParams.get("key")||"";
  if(!validKey(key))return Response.json({error:"Invalid state key."},{status:400});
  const row=await env.DB.prepare("SELECT value_json FROM user_state WHERE user_id=? AND state_key=?").bind(user.id,key).first<{value_json:string}>();
  if(!row)return Response.json({found:false});
  try{return Response.json({found:true,value:JSON.parse(row.value_json)});}catch{return Response.json({found:false});}
}

export async function PUT(request:Request){
  const user=await currentUser(request);
  if(!user)return Response.json({error:"Not signed in."},{status:401});
  const body=await request.json().catch(()=>null) as {key?:string;value?:unknown}|null;
  const key=body?.key||"";
  if(!validKey(key))return Response.json({error:"Invalid state key."},{status:400});
  const valueJson=JSON.stringify(body?.value);
  if(valueJson===undefined||valueJson.length>250000)return Response.json({error:"Saved data is too large."},{status:400});
  const now=Math.floor(Date.now()/1000);
  await env.DB.prepare("INSERT INTO user_state (user_id,state_key,value_json,updated_at) VALUES (?,?,?,?) ON CONFLICT(user_id,state_key) DO UPDATE SET value_json=excluded.value_json,updated_at=excluded.updated_at").bind(user.id,key,valueJson,now).run();
  return Response.json({saved:true,updatedAt:now});
}
