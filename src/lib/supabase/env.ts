// Публичните Supabase настройки. Хвърля ясна грешка, ако липсват,
// вместо неразбираеми откази по-късно.
export function supabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Липсват NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. Вижте .env.example.",
    );
  }
  return { url, key };
}
