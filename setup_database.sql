-- ==========================================
-- SCRIPT DE INICIALIZAÇÃO COMPLETA DO BANCO
-- ==========================================

-- 1. Tabela Principal de Usuários
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'STUDENT',
    password TEXT,
    approved BOOLEAN DEFAULT FALSE,
    avatar TEXT,
    objective TEXT,
    achievements JSONB DEFAULT '[]'::jsonb,
    study_streak INTEGER DEFAULT 0,
    last_study_date TEXT,
    subscription_plan TEXT DEFAULT 'ESSENCIAL',
    plan_id TEXT,
    purchased_products JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger para adicionar usuários automaticamente quando se cadastrarem
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role, approved)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'name', 'Sem Nome'), 'STUDENT', false);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 2. Configurações da Aplicação (Produtos, Cupons, Texto do painel)
CREATE TABLE IF NOT EXISTS public.app_config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Entidades Baseadas em JSON (Apostilas, Simulados, Editais, Planos)
CREATE TABLE IF NOT EXISTS public.materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.simulados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.editais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.study_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    generatedTasks JSONB,
    weeklySchedule JSONB,
    subjectConfigs JSONB,
    extraGoals JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.mentorship_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Progresso e Logs do Aluno
CREATE TABLE IF NOT EXISTS public.user_progress (
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, key)
);

CREATE TABLE IF NOT EXISTS public.user_logins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    ip TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.study_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    content JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Módulo de Flashcards (FC)
CREATE TABLE IF NOT EXISTS public.fc_decks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.fc_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.fc_progress (
    user_id UUID NOT NULL,
    card_id UUID NOT NULL,
    content JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY(user_id, card_id)
);

-- ==============================================================
-- MÓDULO DE REDAÇÃO
-- ==============================================================
CREATE TABLE IF NOT EXISTS public.essay_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL, 
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.essay_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID REFERENCES public.essay_topics(id),
    student_id TEXT NOT NULL, 
    student_name TEXT NOT NULL, 
    content_text TEXT, 
    file_url TEXT, 
    status TEXT CHECK (status IN ('PENDING', 'CORRECTING', 'DONE')) DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.essay_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID REFERENCES public.essay_submissions(id) ON DELETE CASCADE,
    mentor_id TEXT NOT NULL,
    final_score NUMERIC(5,2) NOT NULL,
    feedback_text TEXT NOT NULL,
    competencies_json JSONB, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================
-- BANCO DE QUESTÕES
-- ==============================================================
CREATE TABLE IF NOT EXISTS public.qb_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    statement TEXT NOT NULL,
    statement_image_url TEXT,
    type TEXT NOT NULL CHECK (type IN ('ABCD', 'ABCDE', 'CERTO_ERRADO')),
    board TEXT NOT NULL,
    organ TEXT,
    role TEXT,
    discipline TEXT NOT NULL,
    subject TEXT NOT NULL,
    sub_subject TEXT,
    source TEXT,
    year INTEGER NOT NULL,
    difficulty TEXT CHECK (difficulty IN ('EASY', 'MEDIUM', 'HARD')),
    linked_law_article TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.qb_alternatives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID REFERENCES public.qb_questions(id) ON DELETE CASCADE,
    label TEXT NOT NULL, 
    text TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS public.qb_resolutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID REFERENCES public.qb_questions(id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    legal_basis TEXT,
    video_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.qb_student_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL, 
    question_id UUID REFERENCES public.qb_questions(id) ON DELETE CASCADE,
    selected_alternative_id UUID REFERENCES public.qb_alternatives(id),
    is_correct BOOLEAN NOT NULL,
    time_spent_seconds INTEGER DEFAULT 0,
    status TEXT CHECK (status IN ('ANSWERED', 'REVIEW', 'DOUBT')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.qb_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID REFERENCES public.qb_questions(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.qb_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID REFERENCES public.qb_questions(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    report_type TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT CHECK (status IN ('PENDING', 'RESOLVED')) DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qb_questions_discipline ON public.qb_questions(discipline);
CREATE INDEX IF NOT EXISTS idx_qb_questions_sub_subject ON public.qb_questions(sub_subject);
CREATE INDEX IF NOT EXISTS idx_qb_answers_user ON public.qb_student_answers(user_id);
CREATE INDEX IF NOT EXISTS idx_qb_comments_question ON public.qb_comments(question_id);
CREATE INDEX IF NOT EXISTS idx_qb_reports_status ON public.qb_reports(status);
