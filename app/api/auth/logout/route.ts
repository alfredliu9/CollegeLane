import {clearSessionCookie,deleteCurrentSession} from "@/lib/auth";

export async function GET(request:Request){
  await deleteCurrentSession(request);
  return new Response(null,{status:302,headers:{Location:"/login","Set-Cookie":clearSessionCookie()}});
}
