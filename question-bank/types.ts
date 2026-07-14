
export type QuestionType = 'ABCD' | 'ABCDE' | 'CERTO_ERRADO';
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface QBAlternative {
  id: string;
  label: string;
  text: string;
  is_correct: boolean; // Only visible after answer or in admin
}

export interface QBResolution {
  comment_text: string;
  legal_basis?: string;
  video_url?: string;
}

export interface QBQuestion {
  id: string;
  statement: string;
  statement_image_url?: string;
  type: QuestionType;
  board: string;
  organ?: string;
  role?: string;
  discipline: string;
  subject: string;
  sub_subject?: string;
  source?: string;
  year: number;
  difficulty: Difficulty;
  linked_law_article?: string;
  alternatives: QBAlternative[];
  resolution?: QBResolution; // Fetched only after answer
  is_active: boolean;
}

export interface QBStudentAnswer {
  question_id: string;
  selected_alternative_id: string;
  is_correct: boolean;
  time_spent_seconds: number;
}

export interface QBNotebook {
  id: string;
  name: string;
  questionIds: string[]; // IDs das questões salvas manualmente
  createdAt: string;
}

export interface QBComment {
  id: string;
  question_id: string;
  user_id: string;
  user_name: string;
  comment_text: string;
  created_at: string;
  parent_id?: string | null;
  users?: {
    avatar: string | null;
    role: string;
    name: string;
  };
  likes?: { user_id: string }[];
  replies?: QBComment[];
}

export interface QBReport {
  id: string;
  question_id: string;
  user_id: string;
  user_name: string;
  report_type: string;
  description: string;
  status: 'PENDING' | 'RESOLVED';
  created_at: string;
  question_code?: string; // Virtual field
}

export interface QBFilters {
  discipline?: string[];
  subject?: string[];
  sub_subject?: string[];
  board?: string;
  organ?: string;
  role?: string;
  source?: string;
  year?: number;
  type?: QuestionType;
  difficulty?: Difficulty;
  keyword?: string; // Busca textual no enunciado
  only_mistakes?: boolean; // Filtro de Caderno de Erros (Automático)
  notebookId?: string; // Filtro de Caderno Manual
  status?: 'ALL' | 'SOLVED' | 'UNSOLVED' | 'CORRECT' | 'INCORRECT';
  page?: number;
  pageSize?: number;
}
