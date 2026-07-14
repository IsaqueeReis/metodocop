
export type TaskType = 'AULA' | 'LEI_SECA' | 'Questões' | 'SIMULADO' | 'REVISAO' | 'OUTRO' | 'META_EXTRA';

export interface MentorshipTask {
  id: string;
  dayOfWeek: string; // 'Segunda', 'Terça', etc.
  type: TaskType;
  subject: string;
  description: string;
  isCompleted: boolean;
  date?: string; // YYYY-MM-DD
  originalDate?: string; // To allow perfect reset sem novas colunas
  resumoUrl?: string;
  questoesUrl?: string;
  aulaUrl?: string;
}

export interface DailyMissage {
  id: string;
  date: string; // YYYY-MM-DD
  content: string;
  isRead: boolean;
}

export interface MentorshipPlan {
  studentId: string;
  studentName: string;
  isActive: boolean;
  startDate: string;
  tasks: MentorshipTask[];
  originalTasks?: MentorshipTask[]; // To allow perfect reset
  xp?: number; // Experience points
  messages: DailyMissage[];
  weeklySchedule?: Record<string, string[]>;
  studyMode?: 'CICLOS' | 'CRONOGRAMA';
  planType?: 'EDITAL' | 'FLEXIVEL';
}

export const DAYS_OF_WEEK = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

export const TASK_TYPES: { type: TaskType; label: string; color: string }[] = [
  { type: 'AULA', label: 'Videoaula / PDF', color: 'bg-blue-600' },
  { type: 'LEI_SECA', label: 'Lei Seca', color: 'bg-yellow-600' },
  { type: 'Questões', label: 'Bateria de Questões', color: 'bg-green-600' },
  { type: 'SIMULADO', label: 'Simulado Combate', color: 'bg-red-600' },
  { type: 'REVISAO', label: 'Revisão Estratégica', color: 'bg-purple-600' },
  { type: 'META_EXTRA', label: 'Meta Extra / TAF', color: 'bg-orange-600' },
  { type: 'OUTRO', label: 'Instrução Geral', color: 'bg-zinc-600' },
];

// Interface para o item gerado pela IA
export interface AIPlanItem {
  dayOffset: number;
  subject: string;
  topic: string;
  type: TaskType;
  instructions: string;
}

// Estrutura detectada pela IA na fase 1
export interface DetectedSubject {
  name: string;
  topics: string[];
}

// Configuração de prioridade para a fase 2
export interface SubjectConfig {
  weight: number; // 1 (Baixo) a 3 (Alto)
  difficulty: number; // 1 (Fácil) a 3 (Difícil)
}

// Configuração de Meta Extra
export interface ExtraGoalConfig {
  title: string;
  type: TaskType;
  description: string;
  frequency: 'DAILY' | 'CUSTOM';
  selectedDays: string[]; // ['Segunda', 'Quarta']
}

export interface StudyPlan {
  id: string;
  title: string;
  items: DetectedSubject[];
  generatedTasks?: AIPlanItem[];
  weeklySchedule?: Record<string, string[]>;
  subjectConfigs?: Record<string, SubjectConfig>;
  extraGoals?: ExtraGoalConfig[];
  createdAt: string;
}

export interface GlobalGoalMetadata {
  subject: string;
  topic: string;
  specificMessage: string;
}
