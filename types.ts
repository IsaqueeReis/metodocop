
export enum UserRole {
  ADMIN = 'ADMIN',
  MASTER_ADMIN = 'MASTER_ADMIN',
  STUDENT = 'STUDENT'
}

export enum SubscriptionPlan {
  ESSENCIAL = 'ESSENCIAL',
  METODO_COP = 'METODO_COP'
}

export interface Plan {
  id: string;
  name: string;
  description?: string;
  price?: number;
  features?: string[];
  allowedTabs?: string[]; // IDs das abas que este plano libera para o aluno
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // Added for basic auth logic
  role: UserRole;
  subscriptionPlan?: SubscriptionPlan; // Indicates if user is ESSENCIAL or Premium
  approved: boolean; // Added for admin approval logic
  avatar?: string;
  objective?: string;
  planId?: string; // ID do plano de estudos do aluno
  assignedEditalId?: string; // Edital Fixo (VIP) vinculado pelo Admin
  purchased_products?: string[];
  achievements: Achievement[];
  studyStreak?: number; // Days in a row
  lastStudyDate?: string;
}

export interface Subject {
  id: string;
  name: string;
  totalHoursStudied: number;
}

export interface ScheduleItem {
  day: string; // 'Segunda', 'Terça', etc.
  subjects: string[]; // Subject IDs or Custom Names
}

export interface DailyGoal {
  id: string;
  text: string;
  completed: boolean;
  dateCreated: string; // ISO Date string to check for reset
}

// For Evolution Charts
export interface HistoryPoint {
  date: string;
  count: number;
}

export interface QuestionStats {
  total: number;
  correct: number;
  incorrect: number;
  history: HistoryPoint[]; // Track evolution
  bySubject?: {
    [subjectName: string]: {
      total: number;
      correct: number;
      incorrect: number;
    }
  };
}

// SIMULADO ONLINE QUESTION STRUCTURE
export interface SimuladoQuestion {
  id: string;
  text: string;
  alternatives: { label: string; text: string }[];
  correctAnswer: string; // "A", "B", "C", "E" (Errado), etc.
}

export interface Simulado {
  id: string;
  title: string;
  pdfUrl?: string; // Optional now
  mode: 'PDF' | 'ONLINE'; // New field
  questions?: SimuladoQuestion[]; // Only for ONLINE mode
  answerKey: string; // "1A,2B,3C..." or JSON string (Used for both modes logic)
  coverImage?: string;
  instructions: string;
  questionCount: number;
  type: 'ABCD' | 'ABCDE' | 'CERTO_ERRADO';
  allowedPlanIds?: string[]; // IDs dos planos que podem ver este simulado
}

export interface SimuladoResult {
  simuladoId: string;
  dateTaken: string;
  correctAnswers: number;
  wrongAnswers: number;
  score: number;
  studentAnswers?: string; // "1A,2C..."
}

export interface StudySession {
  id: string;
  subjectId: string;
  durationSeconds: number;
  date: string; // ISO
}

export interface RevisionItem {
  id: string;
  groupId: string; // To group the 1/7/14/28 days together
  subject: string;
  topic: string;
  dateStudied: string; // ISO date of original study
  scheduledDate: string; // ISO date when this specific review is due
  stage: 1 | 7 | 14 | 28;
  completed: boolean;
}

export interface Material {
  id: string;
  title: string;
  subject: string; // acts as the Folder name (Matéria)
  topic?: string; // acts as Sub-folder (Assunto)
  contentHtml: string; // Rich Text Content
  pdfUrl?: string;
  questionsUrl?: string;
  videoUrl?: string;
  category: 'GUIDED' | 'LEI_SECA';
  dateAdded: string;
  order?: number; // Added for ordering within subject
  allowedPlanIds?: string[]; // IDs dos planos que podem ver este material
}

export interface EditalTopic {
  id: string;
  name: string;
}

export interface EditalSubject {
  id: string;
  name: string;
  topics: EditalTopic[];
}

export interface Edital {
  id: string;
  title: string;
  imageUrl?: string;
  subjects: EditalSubject[];
  allowedPlanIds?: string[]; // IDs dos planos que podem ver este edital
}

// Student progress tracking for edital
export interface EditalProgress {
  topicId: string;
  completed: boolean;
}

export interface ProductFolder {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  coverImageUrl: string;
  price: number;
  promotionalPrice?: number;
  folderId?: string;
}

export interface Coupon {
  id: string;
  code: string;
  discountPercentage: number;
}

// --- ESTRUTURAS DE DADOS MENTORIA VIP ---

export type GoalStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED';

export interface MentorshipGoal {
  id: string;
  planId: string; // Ref to MentorshipPlan
  title: string;
  description?: string;
  targetDate: string; // ISO date
  status: GoalStatus;
  order: number; // for kanban ordering
}

export interface MentorshipCycleSubject {
  id: string;
  subjectId: string; // Ref to EditalSubject
  durationMinutes: number; // e.g. 60, 90 mins
  order: number; // Sequence in the cycle wheel
}

export interface MentorshipCycle {
  id: string;
  planId: string; // Ref to MentorshipPlan
  name: string;
  subjects: MentorshipCycleSubject[];
  activeSubjectIndex: number; // Which subject is currently active in the rotation
}

export interface MentorshipMission {
  id: string;
  title: string;
  description: string;
  rewardXp: number;
  condition: string; // e.g., "100_QUESTIONS", "5_HOURS_STUDY"
  isGlobal: boolean; // if false, applies only to specific planId
  planId?: string; 
}

export interface StudentMissionProgress {
  missionId: string;
  studentId: string;
  progress: number; // e.g., 50 (if condition is 100 questions, means 50 questions done)
  completed: boolean;
  completedAt?: string;
}

export interface MentorshipPlan {
  id: string;
  studentId: string;
  editalId: string; // The selected vertical edital for this student
  xp: number; // Gamification experience points
  patent: string; // e.g., "Recruta", "Soldado", etc.
  startDate: string;
}

