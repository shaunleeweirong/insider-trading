import { createClient } from "@supabase/supabase-js";
import { getServerEnv } from "@/lib/env";

export function createServiceClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('Supabase environment variables are not configured')
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    getServerEnv().SUPABASE_SERVICE_ROLE_KEY
  );
}
