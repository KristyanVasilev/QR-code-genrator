import "server-only";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import type { QrValues } from "./types";

export interface QrCodeRow {
  id: string;
  name: string;
  type: string;
  content: QrValues | null;
  payload: string | null;
  design: unknown;
  created_at: string;
  updated_at: string;
}

export const PAGE_SIZE = 24;

const COLUMNS = "id, name, type, content, payload, design, created_at, updated_at";
// Без активен абонамент към браузъра отиват само метаданни — не и съдържанието
const LOCKED_COLUMNS = "id, name, type, created_at, updated_at";

/** Страница от кодовете на текущия потребител (RLS ограничава до собствените). */
export async function listQrCodes({ page = 1, q = "", locked = false }: { page?: number; q?: string; locked?: boolean }) {
  await requireUser();
  const supabase = await createClient();
  const from = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from("qr_codes")
    .select(locked ? LOCKED_COLUMNS : COLUMNS, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  const term = q.trim().slice(0, 100);
  if (term) {
    // Екранираме специалните символи на LIKE, за да се търси буквално
    query = query.ilike("name", `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
  }

  const { data, count, error } = await query;
  if (error) throw new Error(`listQrCodes: ${error.message}`);
  const items = ((data ?? []) as Partial<QrCodeRow>[]).map((r) => ({
    content: null,
    payload: null,
    design: null,
    ...r,
  })) as QrCodeRow[];
  return { items, total: count ?? 0 };
}

export async function getQrCode(id: string): Promise<QrCodeRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.from("qr_codes").select(COLUMNS).eq("id", id).maybeSingle();
  if (error) throw new Error(`getQrCode: ${error.message}`);
  return data as QrCodeRow | null;
}
