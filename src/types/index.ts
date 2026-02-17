import type { Database } from './database.types'

export type Aluno = Database['public']['Tables']['alunos']['Row']
export type AlunoInsert = Database['public']['Tables']['alunos']['Insert']
export type AlunoUpdate = Database['public']['Tables']['alunos']['Update']

export type Professor = Database['public']['Tables']['professores']['Row']
export type ProfessorInsert = Database['public']['Tables']['professores']['Insert']
export type ProfessorUpdate = Database['public']['Tables']['professores']['Update']

export type Turma = Database['public']['Tables']['turmas']['Row']
export type TurmaInsert = Database['public']['Tables']['turmas']['Insert']
export type TurmaUpdate = Database['public']['Tables']['turmas']['Update']

export type Matricula = Database['public']['Tables']['matriculas']['Row']
export type MatriculaInsert = Database['public']['Tables']['matriculas']['Insert']
export type MatriculaUpdate = Database['public']['Tables']['matriculas']['Update']

export type Chamada = Database['public']['Tables']['chamadas']['Row']
export type ChamadaInsert = Database['public']['Tables']['chamadas']['Insert']
export type ChamadaUpdate = Database['public']['Tables']['chamadas']['Update']

export type Presenca = Database['public']['Tables']['presencas']['Row']
export type PresencaInsert = Database['public']['Tables']['presencas']['Insert']
export type PresencaUpdate = Database['public']['Tables']['presencas']['Update']

export type Escala = Database['public']['Tables']['escalas']['Row']
export type EscalaInsert = Database['public']['Tables']['escalas']['Insert']
export type EscalaUpdate = Database['public']['Tables']['escalas']['Update']

export type Usuario = Database['public']['Tables']['usuarios']['Row']
export type UsuarioInsert = Database['public']['Tables']['usuarios']['Insert']
export type UsuarioUpdate = Database['public']['Tables']['usuarios']['Update']

// Views
export type AlunosPorTurma = Database['public']['Views']['vw_alunos_por_turma']['Row']
export type FrequenciaAluno = Database['public']['Views']['vw_frequencia_alunos']['Row']
export type EscalaDetalhada = Database['public']['Views']['vw_escalas_detalhadas']['Row']

// Extended types
export interface TurmaComAlunos extends Turma {
  _count?: {
    alunos: number
  }
}

export interface AlunoComTurma extends Aluno {
  turma?: Turma
}

export interface EscalaComDetalhes extends Escala {
  turma: Turma
  professor: Professor
}

// Chamada types
export interface PresencaAluno {
  aluno_id: string
  presente: boolean
  trouxe_biblia: boolean
  trouxe_revista: boolean
  justificativa?: string
}

export interface VisitantePresenca {
  visitante_id: string
  presente: boolean
  trouxe_biblia: boolean
  trouxe_revista: boolean
}

export interface Visitante {
  id: string
  nome: string
  telefone: string
  observacao?: string
  historico: HistoricoVisitante[]
  presencas_seguidas: number
  criado_em: string
}

export interface HistoricoVisitante {
  data: string
  presente: boolean | null
}

export interface ChamadaCompleta {
  id: string
  turma_id: string
  data: string
  professor_id: string
  presencas: PresencaAluno[]
  visitantes: VisitantePresenca[]
  oferta: number
  anotacoes: string
  created_at: string
  updated_at: string
}

export interface ResumoDia {
  total_matriculados: number
  total_presentes: number
  total_faltas: number
  total_visitantes: number
  total_biblias: number
  total_revistas: number
  total_oferta: number
}

export interface ResumoTurma {
  matriculados: number
  presentes: number
  faltas: number
  visitantes: number
  biblias: number
  revistas: number
  percentual_presenca: number
}
