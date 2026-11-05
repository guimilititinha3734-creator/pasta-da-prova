// "Formatos" dos dados que vêm do banco (ajudam o editor a achar erros)

export type Perfil = {
  id: string;
  nome: string;
  avatar_url: string | null;
};

export type Turma = {
  id: string;
  nome: string;
  codigo_convite: string;
  criada_por: string;
  created_at: string;
};

export type Grupo = {
  id: string;
  turma_id: string;
  nome: string;
  criado_por: string;
};

export type Prova = {
  id: string;
  turma_id: string;
  grupo_id: string | null;
  nome: string;
  materia: string;
  professor: string;
  data: string; // AAAA-MM-DD
  criado_por: string;
};

export type Material = {
  id: string;
  prova_id: string;
  autor_id: string;
  tipo: "foto" | "video" | "video_link" | "pdf" | "nota";
  titulo: string;
  aula_numero: number | null;
  tema: string;
  texto: string;
  arquivo_path: string | null;
  link_url: string | null;
  tamanho_bytes: number;
  created_at: string;
};

// Resultado padrão das ações de formulário
export type EstadoForm = { erro?: string; ok?: string } | undefined;
