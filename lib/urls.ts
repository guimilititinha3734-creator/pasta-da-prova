// Gera links temporários (1 hora) para arquivos privados do Storage.
// Só funciona para quem tem acesso à prova — o RLS do Storage confere.
import type { SupabaseClient } from "@supabase/supabase-js";

export async function linksTemporarios(supabase: SupabaseClient, caminhos: (string | null)[]) {
  const validos = caminhos.filter((c): c is string => !!c);
  const mapa: Record<string, string> = {};
  if (!validos.length) return mapa;

  const { data } = await supabase.storage.from("materiais").createSignedUrls(validos, 60 * 60);
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) mapa[item.path] = item.signedUrl;
  }
  return mapa;
}
