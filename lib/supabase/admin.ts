import "server-only";
import {createClient} from "@supabase/supabase-js";
import {supabaseConfig,supabaseSecret} from "./config";

export function createAdminClient(){
  const {url}=supabaseConfig();
  return createClient(url,supabaseSecret(),{
    auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false},
  });
}
