import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { supabaseEnv } from "./env";

/**
 * Supabase клиент за Server Components, Server Actions и Route Handlers.
 * Работи с правата на влезлия потребител (RLS). Създава се за всяка заявка.
 */
export async function createClient() {
  // Supabase проверява изтичането на токена с текущото време (Date.now()).
  // connection() казва на Next.js да изпълни това само при реална заявка,
  // а не при предварителното рендериране на сесийната обвивка (prefetch).
  await connection();
  const { url, key } = supabaseEnv();
  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(list) {
        try {
          for (const { name, value, options } of list) cookieStore.set(name, value, options);
        } catch {
          // Извикано от Server Component, където бисквитки не могат да се пишат.
          // Безопасно е — proxy.ts опреснява сесията при всяка заявка.
        }
      },
    },
  });
}
