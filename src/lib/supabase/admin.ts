import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseEnv } from "./env";

/**
 * Клиент с пълни права (заобикаля RLS). САМО за сървърен код, който сам
 * проверява за кой потребител работи: Stripe webhook и синхронизация на плащания.
 */
export function createAdminClient() {
  const { url } = supabaseEnv();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Липсва SUPABASE_SERVICE_ROLE_KEY. Вижте .env.example.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
