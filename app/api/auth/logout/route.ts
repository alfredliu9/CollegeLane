import {clearSessionCookie,deleteCurrentSession} from "@/lib/auth";
import {cookieHeaders,createRequestClient} from "@/lib/supabase/server";

export async function GET(request:Request){
  await deleteCurrentSession(request);
  let pending:ReturnType<typeof createRequestClient>["pending"]=[];
  try{
    const state=createRequestClient(request);
    pending=state.pending;
    await state.client.auth.signOut();
  }catch{}
  const response=Response.redirect(new URL("/login",request.url),302);
  response.headers.append("Set-Cookie",clearSessionCookie());
  cookieHeaders(pending).forEach(value=>response.headers.append("Set-Cookie",value));
  response.headers.set("Cache-Control","private, no-store");
  return response;
}
