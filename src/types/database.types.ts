export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      alunos: {
        Row: {
          id: string
          nome: string
          data_nascimento: string | null
          responsavel: string | null
          telefone: string | null
          email: string | null
          endereco: string | null
          foto_url: string | null
          turma_id: string | null        // turma atual matriculado
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nome: string
          data_nascimento?: string | null
          responsavel?: string | null
          telefone?: string | null
          email?: string | null
          endereco?: string | null
          foto_url?: string | null
          turma_id?: string | null
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nome?: string
          data_nascimento?: string | null
          responsavel?: string | null
          telefone?: string | null
          email?: string | null
          endereco?: string | null
          foto_url?: string | null
          turma_id?: string | null
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      professores: {
        Row: {
          id: string
          nome: string
          telefone: string | null
          email: string | null
          foto_url: string | null
          especialidade: string | null
          turma_aluno_id: string | null   // turma em que o professor também é aluno
          data_nascimento: string | null
          data_ingresso: string | null
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nome: string
          telefone?: string | null
          email?: string | null
          foto_url?: string | null
          especialidade?: string | null
          turma_aluno_id?: string | null
          data_nascimento?: string | null
          data_ingresso?: string | null
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nome?: string
          telefone?: string | null
          email?: string | null
          foto_url?: string | null
          especialidade?: string | null
          turma_aluno_id?: string | null
          data_nascimento?: string | null
          data_ingresso?: string | null
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      // Relação N:N professor → turmas que leciona
      professor_turmas: {
        Row: {
          professor_id: string
          turma_id: string
        }
        Insert: {
          professor_id: string
          turma_id: string
        }
        Update: {
          professor_id?: string
          turma_id?: string
        }
      }
      turmas: {
        Row: {
          id: string
          nome: string
          descricao: string | null
          faixa_etaria: string | null
          sala: string | null
          cor: string            // cor identificadora (ex: 'bg-blue-500')
          ativa: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nome: string
          descricao?: string | null
          faixa_etaria?: string | null
          sala?: string | null
          cor?: string
          ativa?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nome?: string
          descricao?: string | null
          faixa_etaria?: string | null
          sala?: string | null
          cor?: string
          ativa?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      // alunos com turma_id direto (sem tabela de matrícula separada)

      matriculas: {
        Row: {
          id: string
          aluno_id: string
          turma_id: string
          data_matricula: string
          ativa: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          aluno_id: string
          turma_id: string
          data_matricula?: string
          ativa?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          aluno_id?: string
          turma_id?: string
          data_matricula?: string
          ativa?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      chamadas: {
        Row: {
          id: string
          turma_id: string
          professor_id: string | null
          data: string
          trimestre: number | null
          ano: number | null
          oferta: number
          anotacoes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          turma_id: string
          professor_id?: string | null
          data: string
          oferta?: number
          anotacoes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          turma_id?: string
          professor_id?: string | null
          data?: string
          oferta?: number
          anotacoes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      presencas: {
        Row: {
          id: string
          chamada_id: string
          aluno_id: string
          presente: boolean
          observacao: string | null
          trouxe_biblia: boolean
          trouxe_revista: boolean
          justificativa: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          chamada_id: string
          aluno_id: string
          presente: boolean
          observacao?: string | null
          trouxe_biblia?: boolean
          trouxe_revista?: boolean
          justificativa?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          chamada_id?: string
          aluno_id?: string
          presente?: boolean
          observacao?: string | null
          trouxe_biblia?: boolean
          trouxe_revista?: boolean
          justificativa?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      escalas: {
        Row: {
          id: string
          turma_id: string
          professor_id: string
          data: string
          trimestre: number
          ano: number
          confirmado: boolean
          observacoes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          turma_id: string
          professor_id: string
          data: string
          trimestre?: number
          ano?: number
          confirmado?: boolean
          observacoes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          turma_id?: string
          professor_id?: string
          data?: string
          trimestre?: number
          ano?: number
          confirmado?: boolean
          observacoes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      usuarios: {
        Row: {
          id: string
          nome: string
          email: string
          role: string
          foto_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          nome: string
          email: string
          role?: string
          foto_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nome?: string
          email?: string
          role?: string
          foto_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      visitantes: {
        Row: {
          id: string
          nome: string
          telefone: string
          email: string | null
          observacao: string | null
          convertido_em_aluno: boolean
          aluno_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nome: string
          telefone: string
          email?: string | null
          observacao?: string | null
          convertido_em_aluno?: boolean
          aluno_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nome?: string
          telefone?: string
          email?: string | null
          observacao?: string | null
          convertido_em_aluno?: boolean
          aluno_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      historico_visitantes: {
        Row: {
          id: string
          visitante_id: string
          turma_id: string
          chamada_id: string | null
          data: string
          presente: boolean
          trouxe_biblia: boolean
          trouxe_revista: boolean
          observacao: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          visitante_id: string
          turma_id: string
          chamada_id?: string | null
          data: string
          presente: boolean
          trouxe_biblia?: boolean
          trouxe_revista?: boolean
          observacao?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          visitante_id?: string
          turma_id?: string
          chamada_id?: string | null
          data?: string
          presente?: boolean
          trouxe_biblia?: boolean
          trouxe_revista?: boolean
          observacao?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      vw_alunos_por_turma: {
        Row: {
          turma_id: string | null
          turma_nome: string | null
          aluno_id: string | null
          aluno_nome: string | null
          data_nascimento: string | null
          responsavel: string | null
          telefone: string | null
          data_matricula: string | null
          ativa: boolean | null
        }
      }
      vw_frequencia_alunos: {
        Row: {
          aluno_id: string | null
          aluno_nome: string | null
          turma_id: string | null
          turma_nome: string | null
          total_aulas: number | null
          presencas: number | null
          faltas: number | null
          percentual_presenca: number | null
        }
      }
      vw_escalas_detalhadas: {
        Row: {
          id: string | null
          data: string | null
          trimestre: number | null
          ano: number | null
          confirmado: boolean | null
          observacoes: string | null
          turma_id: string | null
          turma_nome: string | null
          sala: string | null
          professor_id: string | null
          professor_nome: string | null
          professor_telefone: string | null
          professor_email: string | null
        }
      }
      vw_resumo_chamadas_dia: {
        Row: {
          data: string | null
          total_turmas: number | null
          total_presentes: number | null
          total_faltas: number | null
          total_visitantes: number | null
          total_biblias_alunos: number | null
          total_biblias_visitantes: number | null
          total_revistas_alunos: number | null
          total_revistas_visitantes: number | null
          total_oferta: number | null
        }
      }
      vw_visitantes_com_historico: {
        Row: {
          id: string | null
          nome: string | null
          telefone: string | null
          email: string | null
          observacao: string | null
          convertido_em_aluno: boolean | null
          aluno_id: string | null
          total_presencas: number | null
          total_faltas: number | null
          ultima_presenca: string | null
          created_at: string | null
        }
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// ── Tipos auxiliares exportados ───────────────────────────────────────────────
export type DbTurma         = Database['public']['Tables']['turmas']['Row']
export type DbTurmaInsert   = Database['public']['Tables']['turmas']['Insert']
export type DbTurmaUpdate   = Database['public']['Tables']['turmas']['Update']

export type DbProfessor       = Database['public']['Tables']['professores']['Row']
export type DbProfessorInsert = Database['public']['Tables']['professores']['Insert']
export type DbProfessorUpdate = Database['public']['Tables']['professores']['Update']

export type DbAluno       = Database['public']['Tables']['alunos']['Row']
export type DbAlunoInsert = Database['public']['Tables']['alunos']['Insert']
export type DbAlunoUpdate = Database['public']['Tables']['alunos']['Update']

export type DbChamada       = Database['public']['Tables']['chamadas']['Row']
export type DbChamadaInsert = Database['public']['Tables']['chamadas']['Insert']
export type DbChamadaUpdate = Database['public']['Tables']['chamadas']['Update']

export type DbPresenca       = Database['public']['Tables']['presencas']['Row']
export type DbPresencaInsert = Database['public']['Tables']['presencas']['Insert']
export type DbPresencaUpdate = Database['public']['Tables']['presencas']['Update']

export type DbVisitante       = Database['public']['Tables']['visitantes']['Row']
export type DbVisitanteInsert = Database['public']['Tables']['visitantes']['Insert']
export type DbVisitanteUpdate = Database['public']['Tables']['visitantes']['Update']

export type DbEscala       = Database['public']['Tables']['escalas']['Row']
export type DbEscalaInsert = Database['public']['Tables']['escalas']['Insert']
export type DbEscalaUpdate = Database['public']['Tables']['escalas']['Update']

export type DbProfessorTurma = Database['public']['Tables']['professor_turmas']['Row']

