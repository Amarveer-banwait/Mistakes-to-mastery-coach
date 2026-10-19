export type Difficulty = 'easy' | 'medium' | 'hard';

export type ErrorType =
  | 'no_knowledge'
  | 'concept_confusion'
  | 'misunderstood_question'
  | 'wrong_option_selected'
  | 'guessing'
  | 'recall_difficulty'
  | 'unknown_cause';

export type Confidence = 'very_confident' | 'somewhat_confident' | 'not_confident';

export interface Concept {
  id: string;
  topic: string;
  name: string;
}

export interface Question {
  id: string;
  conceptId: string;
  difficulty: Difficulty;
  prompt: string;
  options: string[];
  correctOption: number;
  explanation: string;
  whyCorrect: string;
  whyOthersWrong: string[];
}

export interface ConceptLearning {
  conceptId: string;
  simpleLanguage: string;
  detailedExplanation: string;
  keyDistinctions: { aspect: string; a: string; b: string; labelA: string; labelB: string }[];
  examples: string[];
  commonTraps: string[];
  takeaways: string[];
}

export interface Attempt {
  id: string;
  questionId: string;
  conceptId: string;
  selectedOption: number;
  correctOption: number;
  isCorrect: boolean;
  timestamp: number;
  context: 'practice' | 'retest' | 'review' | 'coach_practice';
  practiceType?: string;
  retestId?: string;
  linkedMistakeAttemptId?: string;
}

export interface Reflection {
  attemptId: string;
  errorType: ErrorType | null;
  confidence: Confidence | null;
  savedAt: number;
}

export interface RevisionTask {
  id: string;
  conceptId: string;
  status: 'pending' | 'completed' | 'reviewed';
  createdAt: number;
  completedAt?: number;
  reviewDueAt?: number;
  reviewRetestId?: string;
}

export interface Retest {
  id: string;
  type: 'retest' | 'review';
  conceptIds: string[];
  questionIds: string[];
  startedAt: number;
  completedAt?: number;
  sourceTaskId?: string;
  summary?: {
    score: number;
    total: number;
    newQuestionCount: number;
    repeatedQuestionCount: number;
  };
}

export interface AppState {
  attempts: Attempt[];
  reflections: Reflection[];
  revisionTasks: RevisionTask[];
  retests: Retest[];
  version: number;
}

export const ERROR_TYPE_LABELS: Record<ErrorType, string> = {
  no_knowledge: "I didn't know the concept",
  concept_confusion: 'I confused two similar concepts',
  misunderstood_question: 'I misunderstood the question',
  wrong_option_selected: 'I knew it but selected the wrong option',
  guessing: 'I guessed the answer',
  recall_difficulty: "I had studied it but couldn't recall it",
  unknown_cause: "I'm not sure why I got it wrong",
};

export const CONFIDENCE_LABELS: Record<Confidence, string> = {
  very_confident: 'Very confident',
  somewhat_confident: 'Somewhat confident',
  not_confident: 'Not confident',
};
