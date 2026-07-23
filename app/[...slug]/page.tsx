import { Prototype } from "@/components/Prototype";
import {currentUser} from "@/lib/auth";
import {headers} from "next/headers";
import {redirect} from "next/navigation";

export const dynamic="force-dynamic";

const protectedRoots=new Set(["onboarding","dashboard","assessment","schools","school","plan","assistant","email-builder","outreach","profile"]);

export default async function Page({params}:{params:Promise<{slug:string[]}>}){
  const {slug}=await params;
  if(protectedRoots.has(slug[0]||"")){
    const incoming=await headers();
    const request=new Request("https://collegelane.local/"+slug.join("/"),{headers:incoming});
    if(!await currentUser(request)){
      const next="/"+slug.map(encodeURIComponent).join("/");
      redirect(`/login?next=${encodeURIComponent(next)}`);
    }
  }
  return <Prototype />;
}
