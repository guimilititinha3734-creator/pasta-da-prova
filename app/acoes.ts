"use server";

// "Server actions": funções que rodam no servidor quando um formulário é enviado.
// Todas passam pelo Supabase com o login da pessoa, então o RLS vale sempre.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirLogin } from "@/lib/supabase/server";
import type { EstadoForm } from "@/lib/tipos";

export async function criarTurma(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const nome = String(form.get("nome") ?? "").trim();
  if (nome.length < 2) return { erro: "Dê um nome para a turma." };

  const { supabase } = await exigirLogin();
  const { data, error } = await supabase.rpc("criar_turma", { p_nome: nome });
  if (error) return { erro: error.message };

  redirect(`/turmas/${data}`);
}

export async function entrarTurma(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const codigo = String(form.get("codigo") ?? "").trim();
  if (!codigo) return { erro: "Digite o código de convite." };

  const { supabase } = await exigirLogin();
  const { data, error } = await supabase.rpc("entrar_turma", { p_codigo: codigo });
  if (error) return { erro: error.message };

  redirect(`/turmas/${data}`);
}

export async function criarGrupo(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const turmaId = String(form.get("turma_id"));
  const nome = String(form.get("nome") ?? "").trim();
  if (nome.length < 2) return { erro: "Dê um nome para o grupo." };

  const { supabase } = await exigirLogin();
  const { data, error } = await supabase.rpc("criar_grupo", { p_turma: turmaId, p_nome: nome });
  if (error) return { erro: error.message };

  redirect(`/turmas/${turmaId}/grupos/${data}`);
}

export async function adicionarAoGrupo(form: FormData) {
  const grupoId = String(form.get("grupo_id"));
  const turmaId = String(form.get("turma_id"));
  const userId = String(form.get("user_id"));

  const { supabase } = await exigirLogin();
  await supabase.from("grupo_membros").insert({ grupo_id: grupoId, user_id: userId });
  revalidatePath(`/turmas/${turmaId}/grupos/${grupoId}`);
}

export async function removerDoGrupo(form: FormData) {
  const grupoId = String(form.get("grupo_id"));
  const turmaId = String(form.get("turma_id"));
  const userId = String(form.get("user_id"));

  const { supabase, user } = await exigirLogin();
  await supabase.from("grupo_membros").delete().match({ grupo_id: grupoId, user_id: userId });

  if (userId === user.id) redirect(`/turmas/${turmaId}`);
  revalidatePath(`/turmas/${turmaId}/grupos/${grupoId}`);
}

export async function apagarGrupo(form: FormData) {
  const grupoId = String(form.get("grupo_id"));
  const turmaId = String(form.get("turma_id"));

  const { supabase } = await exigirLogin();

  // apaga os arquivos das provas deste grupo antes (o banco apaga o resto)
  const { data: arquivos } = await supabase
    .from("materiais")
    .select("arquivo_path, provas!inner ( grupo_id )")
    .eq("provas.grupo_id", grupoId)
    .not("arquivo_path", "is", null);
  const caminhos = (arquivos ?? []).map((a) => a.arquivo_path as string);
  if (caminhos.length) await supabase.storage.from("materiais").remove(caminhos);

  await supabase.from("grupos").delete().eq("id", grupoId);
  redirect(`/turmas/${turmaId}`);
}

export async function sairDaTurma(form: FormData) {
  const turmaId = String(form.get("turma_id"));
  const { supabase, user } = await exigirLogin();
  await supabase.from("turma_membros").delete().match({ turma_id: turmaId, user_id: user.id });
  redirect("/");
}

export async function trocarCodigo(form: FormData) {
  const turmaId = String(form.get("turma_id"));
  const { supabase } = await exigirLogin();
  await supabase.rpc("novo_codigo_turma", { p_turma: turmaId });
  revalidatePath(`/turmas/${turmaId}`);
}

// ---------------------------------------------------------------------
// ETAPA 2: perfil, provas, materiais, comentários, importantes
// ---------------------------------------------------------------------

export async function atualizarNome(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const nome = String(form.get("nome") ?? "").trim();
  if (nome.length < 2 || nome.length > 60) return { erro: "O nome precisa ter entre 2 e 60 letras." };
  const { supabase, user } = await exigirLogin();
  const { error } = await supabase.from("profiles").update({ nome }).eq("id", user.id);
  if (error) return { erro: error.message };
  revalidatePath("/", "layout");
  return { ok: "Nome salvo!" };
}

export async function criarProva(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const turmaId = String(form.get("turma_id"));
  const grupoId = String(form.get("grupo_id") ?? "") || null;
  const nome = String(form.get("nome") ?? "").trim();
  const materia = String(form.get("materia") ?? "").trim();
  const professor = String(form.get("professor") ?? "").trim();
  const data = String(form.get("data") ?? "");

  if (nome.length < 2) return { erro: "Dê um nome para a prova (ex.: P1)." };
  if (materia.length < 2) return { erro: "Qual é a matéria?" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return { erro: "Escolha a data da prova." };

  const { supabase, user } = await exigirLogin();
  const { data: nova, error } = await supabase
    .from("provas")
    .insert({ turma_id: turmaId, grupo_id: grupoId, nome, materia, professor, data, criado_por: user.id })
    .select("id")
    .single();
  if (error) return { erro: error.message };

  redirect(`/provas/${nova.id}`);
}

export async function apagarProva(form: FormData) {
  const provaId = String(form.get("prova_id"));
  const { supabase } = await exigirLogin();

  const { data: prova } = await supabase.from("provas").select("turma_id").eq("id", provaId).single();
  // apaga os arquivos primeiro (o banco apaga os materiais sozinho)
  const { data: arquivos } = await supabase
    .from("materiais")
    .select("arquivo_path")
    .eq("prova_id", provaId)
    .not("arquivo_path", "is", null);
  const caminhos = (arquivos ?? []).map((a) => a.arquivo_path as string);
  if (caminhos.length) await supabase.storage.from("materiais").remove(caminhos);

  await supabase.from("provas").delete().eq("id", provaId);
  redirect(prova ? `/turmas/${prova.turma_id}` : "/");
}

export async function alternarImportante(form: FormData) {
  const materialId = String(form.get("material_id"));
  const marcado = form.get("marcado") === "1";
  const { supabase, user } = await exigirLogin();

  if (marcado) {
    await supabase.from("importantes").delete().match({ material_id: materialId, user_id: user.id });
  } else {
    await supabase.from("importantes").insert({ material_id: materialId, user_id: user.id });
  }
  revalidatePath(String(form.get("caminho") ?? "/"));
}

export async function comentar(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const materialId = String(form.get("material_id"));
  const texto = String(form.get("texto") ?? "").trim();
  if (!texto) return { erro: "Escreva algo antes de enviar." };

  const { supabase, user } = await exigirLogin();
  const { error } = await supabase.from("comentarios").insert({ material_id: materialId, autor_id: user.id, texto });
  if (error) return { erro: error.message };
  revalidatePath(`/materiais/${materialId}`);
  return { ok: "enviado" };
}

export async function apagarComentario(form: FormData) {
  const id = String(form.get("comentario_id"));
  const materialId = String(form.get("material_id"));
  const { supabase } = await exigirLogin();
  await supabase.from("comentarios").delete().eq("id", id);
  revalidatePath(`/materiais/${materialId}`);
}

export async function apagarMaterial(form: FormData) {
  const id = String(form.get("material_id"));
  const { supabase } = await exigirLogin();

  const { data: mat } = await supabase.from("materiais").select("prova_id, arquivo_path").eq("id", id).single();
  if (!mat) redirect("/");

  const { error } = await supabase.from("materiais").delete().eq("id", id);
  if (!error && mat.arquivo_path) await supabase.storage.from("materiais").remove([mat.arquivo_path]);
  redirect(`/provas/${mat.prova_id}`);
}

export async function sair() {
  const { supabase } = await exigirLogin();
  await supabase.auth.signOut();
  redirect("/entrar");
}
