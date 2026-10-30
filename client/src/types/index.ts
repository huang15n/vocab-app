export type Category = 'verbe' | 'nom' | 'adjectif' | 'expression' | 'adverbe' | 'autre';
export type LearningStatus = 'nouveau' | 'en_cours' | 'appris' | 'a_reviser';

export interface Example {
  sentence: string;
  translation: string;
}

export interface PersonForms {
  je?: string;
  tu?: string;
  'il/elle/on'?: string;
  nous?: string;
  vous?: string;
  'ils/elles'?: string;
  que_je?: string;
  que_tu?: string;
  'qu_il/elle/on'?: string;
  que_nous?: string;
  que_vous?: string;
  'qu_ils/elles'?: string;
}

export interface TenseForms {
  [tense: string]: PersonForms | string | undefined;
}

export interface Conjugations {
  indicatif?: TenseForms;
  subjonctif?: TenseForms;
  conditionnel?: TenseForms;
  imperatif?: TenseForms;
  infinitif?: { present?: string; passe?: string };
  participe?: { present?: string; passe?: string };
  gerondif?: { present?: string };
}

export interface Word {
  id: number;
  userId?: number;
  word: string;
  category: Category;
  ipa: string;
  translations: {
    en: string;
    es: string;
    fr?: string;
  };
  definition?: string;
  examples: Example[];
  collocations: string[];
  synonyms: string[];
  antonyms: string[];
  tags: string[];
  cefrLevel: string;
  learningStatus: LearningStatus;
  conjugations: Conjugations | null;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WordFormData {
  word: string;
  category: Category;
  ipa: string;
  translations: { en: string; es: string; fr?: string };
  definition?: string;
  examples: Example[];
  collocations: string[];
  synonyms: string[];
  antonyms: string[];
  tags: string[];
  cefrLevel: string;
  learningStatus: LearningStatus;
  conjugations: Conjugations | null;
  notes?: string;
}

export interface User {
  id: number;
  email: string;
  name: string;
}

export interface StudySet {
  id: number;
  userId: number;
  name: string;
  description: string;
  wordIds: number[];
  wordCount?: number;
  words?: Word[];
  createdAt: string;
  updatedAt: string;
}

export interface Progress {
  userId: number;
  wordId: number;
  ease: number;
  interval: number;
  repetitions: number;
  nextReview: string;
  correctCount: number;
  incorrectCount: number;
  lastReviewed: string | null;
  status: 'nouveau' | 'learning' | 'review' | 'mastered';
}

export interface Stats {
  total: number;
  byCategory: Record<string, number>;
  byStatus: Record<string, number>;
  setsCount: number;
  dueCount: number;
  mastered: number;
  totalReviews: number;
}

export interface Flashcard {
  id: number;
  front: string;
  back: string;
  ipa: string;
  category: string;
  example: string;
  progress: Progress;
}

export interface QuizQuestion {
  wordId: number;
  prompt: string;
  ipa: string;
  type: 'mcq' | 'write';
  options?: string[];
}
