import { createClient, SupabaseClient } from "@supabase/supabase-js";

export const BUCKET = "carrosseis";

let _db: SupabaseClient | null = null;

function client(): SupabaseClient {
  if (!_db) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!url || !key) throw new Error("Faltam SUPABASE_URL e SUPABASE_SERVICE_KEY nas variáveis de ambiente.");
    _db = createClient(url, key, { auth: { persistSession: false } });
  }
  return _db;
}

/** Cliente preguiçoso: só conecta quando usado, para o build não exigir as chaves. */
export const db = new Proxy({} as SupabaseClient, {
  get(_t, prop) {
    const c: any = client();
    const v = c[prop];
    return typeof v === "function" ? v.bind(c) : v;
  },
});
