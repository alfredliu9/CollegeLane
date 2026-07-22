import {currentUser} from "@/lib/auth";

export async function GET(request:Request){
  const user=await currentUser(request);
  return user?Response.json({user}):Response.json({error:"Not signed in."},{status:401});
}
