import {env} from "cloudflare:workers";
import {currentUser} from "@/lib/auth";

type UploadEnv={UPLOADS:R2Bucket};
async function ensureTable(){await env.DB.batch([
  env.DB.prepare("CREATE TABLE IF NOT EXISTS user_uploads (id TEXT PRIMARY KEY,user_id TEXT NOT NULL,kind TEXT NOT NULL,filename TEXT NOT NULL,content_type TEXT NOT NULL,size INTEGER NOT NULL,object_key TEXT NOT NULL,created_at INTEGER NOT NULL)"),
  env.DB.prepare("CREATE INDEX IF NOT EXISTS user_uploads_user_id_idx ON user_uploads(user_id)")
]);}
export async function POST(request:Request){
  const user=await currentUser(request);if(!user)return Response.json({error:"Not signed in."},{status:401});
  const form=await request.formData();const file=form.get("file"),kind=String(form.get("kind")||"");
  if(!(file instanceof File)||!(["video","transcript"].includes(kind)))return Response.json({error:"Choose a valid file."},{status:400});
  const valid=kind==="video"?file.type==="video/mp4"&&file.size<=100*1024*1024:file.type==="application/pdf"&&file.size<=10*1024*1024;
  if(!valid)return Response.json({error:kind==="video"?"Video must be an MP4 file no larger than 100 MB.":"Transcript must be a PDF no larger than 10 MB."},{status:400});
  await ensureTable();const id=crypto.randomUUID(),objectKey=`${user.id}/${id}/${file.name.replace(/[^a-zA-Z0-9._-]/g,"_")}`;
  await (env as unknown as UploadEnv).UPLOADS.put(objectKey,file.stream(),{httpMetadata:{contentType:file.type}});
  await env.DB.prepare("INSERT INTO user_uploads VALUES (?,?,?,?,?,?,?,?)").bind(id,user.id,kind,file.name,file.type,file.size,objectKey,Math.floor(Date.now()/1000)).run();
  return Response.json({id,kind,filename:file.name,size:file.size,url:`/api/uploads?id=${id}`});
}
export async function GET(request:Request){
  const user=await currentUser(request);if(!user)return new Response("Not signed in.",{status:401});await ensureTable();
  const id=new URL(request.url).searchParams.get("id")||"";const row=await env.DB.prepare("SELECT filename,content_type AS contentType,object_key AS objectKey FROM user_uploads WHERE id=? AND user_id=?").bind(id,user.id).first<{filename:string;contentType:string;objectKey:string}>();
  if(!row)return new Response("Not found.",{status:404});const object=await (env as unknown as UploadEnv).UPLOADS.get(row.objectKey);if(!object)return new Response("Not found.",{status:404});
  return new Response(object.body,{headers:{"Content-Type":row.contentType,"Content-Disposition":`attachment; filename=\"${row.filename.replaceAll('"','')}\"`}});
}
