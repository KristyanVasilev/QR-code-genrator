"use server";

import { refresh } from "next/cache";
import type { PostgrestError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import { buildPayload, getQrType, sanitizeValues } from "./types";
import { sanitizeDesign } from "./render";

export interface SaveInput {
  name: string;
  type: string;
  content: unknown;
  design: unknown;
}

/** error е код — текстът е в речника (qrErrors.<код>) */
export type SaveResult = { ok: true; id: string } | { ok: false; error: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Повторна валидация на сървъра — клиентът може да бъде заобиколен.
 * Payload-ът се изчислява наново тук; изпратеният от браузъра не се ползва.
 */
type Prepared = { ok: true; row: Record<string, unknown> } | { ok: false; error: string };

function prepare(input: SaveInput): Prepared {
  const name = typeof input?.name === "string" ? input.name.trim() : "";
  if (!name) return { ok: false, error: "name_required" };
  if (name.length > 120) return { ok: false, error: "name_too_long" };

  const def = getQrType(typeof input.type === "string" ? input.type : "");
  if (!def) return { ok: false, error: "unknown_type" };

  const content = sanitizeValues(def, input.content);
  const built = buildPayload(def.id, content);
  if (!built.ok) return { ok: false, error: "invalid_content" };

  return { ok: true, row: { name, type: def.id, content, payload: built.payload, design: sanitizeDesign(input.design) } };
}

function dbCode(err: PostgrestError): string {
  if (err.message.includes("subscription_required")) return "subscription_required";
  if (err.message.includes("plan_limit_reached")) return "plan_limit";
  if (err.message.includes("plan_feature_unavailable")) return "feature_unavailable";
  console.error("[qr]", err.code, err.message);
  return "save_failed";
}

export async function createQr(input: SaveInput): Promise<SaveResult> {
  if (!(await getCurrentUser())) return { ok: false, error: "session_expired" };
  const p = prepare(input);
  if (!p.ok) return p;

  const supabase = await createClient();
  // user_id се попълва от базата (auth.uid()); RLS и тригерът пазят лимита
  const { data, error } = await supabase.from("qr_codes").insert(p.row).select("id").single();
  if (error) return { ok: false, error: dbCode(error) };
  refresh(); // обновява кеша на клиентския рутер (таблото, броячите)
  return { ok: true, id: data.id };
}

export async function updateQr(id: string, input: SaveInput): Promise<SaveResult> {
  if (typeof id !== "string" || !UUID_RE.test(id)) return { ok: false, error: "invalid_id" };
  if (!(await getCurrentUser())) return { ok: false, error: "session_expired" };
  const p = prepare(input);
  if (!p.ok) return p;

  const supabase = await createClient();
  const { data, error } = await supabase.from("qr_codes").update(p.row).eq("id", id).select("id").maybeSingle();
  if (error) return { ok: false, error: dbCode(error) };
  if (!data) return { ok: false, error: "not_found" };
  refresh();
  return { ok: true, id: data.id };
}

export async function deleteQr(id: string): Promise<{ ok: boolean; error?: string }> {
  if (typeof id !== "string" || !UUID_RE.test(id)) return { ok: false, error: "invalid_id" };
  if (!(await getCurrentUser())) return { ok: false, error: "session_expired" };

  const supabase = await createClient();
  const { data, error } = await supabase.from("qr_codes").delete().eq("id", id).select("id");
  if (error) return { ok: false, error: dbCode(error) };
  if (!data.length) return { ok: false, error: "not_found" };
  refresh();
  return { ok: true };
}
