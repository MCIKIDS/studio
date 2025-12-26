
export type Role = 'visitante' | 'lider' | 'auxiliar';

export interface User {
  uid: string;
  nome: string;
  papel: Role;
}

export interface Student {
  id: string;
  nome: string;
  tipo: 'aluno' | 'convidado';
}

export interface Presence {
  id: string;
  alunoId: string;
  dataISO: string;
  presente: boolean;
  registradoPorNome: string;
  papel: Role;
  criadoEm: string;
}

export interface Offering {
  id: string;
  categoria: 'oferta' | 'gasto';
  tipo: 'entrada' | 'saida';
  valor: number;
  obs?: string;
  criadoEm: string;
  registradoPorNome: string;
  papel: Role;
}

export interface Comment {
  nome: string;
  texto: string;
  aprovado: boolean;
}

export interface FeedItem {
  id: string;
  texto: string;
  publico: boolean;
  mencionados: string[];
  tipo: 'aviso' | 'evento' | 'escala';
  criadoEm: string;
  criadoPorNome: string;
  reacoes: { gostei: number; coracao: number; festa: number };
  comentarios: Comment[];
  // Rastreio de quem reagiu (Mapa de UID -> Tipo de Reação)
  usuariosQueReagiram?: Record<string, 'gostei' | 'coracao' | 'festa' | null>;
}

export interface FileEntry {
  id: string;
  titulo: string;
  tipo: 'pdf' | 'txt';
  url: string;
  criadoEm: string;
}

export interface Registration {
  id: string;
  nome: string;
  nasc: string;
  resp: string;
  tel: string;
  endereco: string;
  telEmerg: string;
  contatoEmerg: string;
  obs: string;
  criadoEm: string;
}

export type Area = 'pais' | 'lider' | 'auxiliar' | 'oferta' | 'feed' | 'arquivos' | 'presenca' | 'mural';
