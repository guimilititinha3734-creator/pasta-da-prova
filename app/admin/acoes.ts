"use server";

// Ações do painel de administração. O banco confere se quem chama é admin
// (funções admin_*), então mesmo que alguém descubra estas ações, não passa.
import { revalidatePath } from "next/cache";
import { exigirLogin } from "@/lib/supabase/server";
import type { EstadoForm } from "@/lib/tipos";

const MB = 1024 * 1024;

function lerTamanho(valor: FormDataEntryValue | null, unidade: FormDataEntryValue | null): number | null {
  const n = Number(String(valor ?? "").replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * (unidade === "GB" ? 1024 * MB : MB));
}

export async function salvarCotaTurma(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const turmaId = String(form.get("turma_id"));
  const cota = lerTamanho(form.get("cota"), form.get("unidade"));
  const comPlano = form.get("com_plano") === "on";
  const planoNome = String(form.get("plano_nome") ?? "").trim();
  const planoAte = String(form.get("plano_ate") ?? "");

  if (cota === null) return { erro: "Digite um tamanho válido (ex.: 200 MB ou 10 GB)." };
  if (comPlano && !planoNome) return { erro: "Dê um nome ao plano (ex.: Pro 10 GB)." };
  if (comPlano && !/^\d{4}-\d{2}-\d{2}$/.test(planoAte)) return { erro: "Escolha até quando o plano vale." };

  const { supabase } = await exigirLogin();
  const { error } = await supabase.rpc("admin_definir_cota", {
    p_turma: turmaId,
    p_cota_bytes: cota,
    p_plano_nome: comPlano ? planoNome : null,
    p_plano_ate: comPlano ? planoAte : null,
  });
  if (error) return { erro: error.message };
  revalidatePath("/admin");
  return { ok: "Salvo!" };
}

export async function removerPlano(form: FormData) {
  const { supabase } = await exigirLogin();
  await supabase.rpc("admin_remover_plano", { p_turma: String(form.get("turma_id")) });
  revalidatePath("/admin");
}

export async function salvarConfig(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const capacidade = lerTamanho(form.get("capacidade_gb"), "GB");
  const cotaPadrao = lerTamanho(form.get("cota_padrao_mb"), "MB");
  if (!capacidade || cotaPadrao === null) return { erro: "Valores inválidos." };

  const { supabase } = await exigirLogin();
  const { error } = await supabase.rpc("admin_config", { p_capacidade: capacidade, p_cota_padrao: cotaPadrao });
  if (error) return { erro: error.message };
  revalidatePath("/admin");
  return { ok: "Configuração salva!" };
}
