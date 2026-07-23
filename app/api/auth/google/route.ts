import {cookieHeaders,createRequestClient} from "@/lib/supabase/server";

function safeNext(value:string|null){
  return value&&value.startsWith("/")&&!value.startsWith("//")?value:"/dashboard";
}

export async function GET(request:Request){
  try{
    const {client,pending}=createRequestClient(request);
    const callback=new URL("/auth/callback",request.url);
    callback.searchParams.set("next",safeNext(new URL(request.url).searchParams.get("next")));
    const {data,error}=await client.auth.signInWithOAuth({provider:"google",options:{redirectTo:callback.toString(),skipBrowserRedirect:true}});
    if(error||!data.url)throw error||new Error("Google sign-in is unavailable.");
    const response=new Response(null,{status:302,headers:{Location:data.url}});
    cookieHeaders(pending).forEach(value=>response.headers.append("Set-Cookie",value));
    response.headers.set("Cache-Control","private, no-store");
    return response;
  }catch(error){
    const url=new URL("/login",request.url);
    url.searchParams.set("error",error instanceof Error?error.message:"Google sign-in is unavailable.");
    return Response.redirect(url,302);
  }
}
