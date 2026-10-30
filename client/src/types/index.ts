export type Category = 'verbe' | 'nom' | 'adjectif' | 'expression' | 'adverbe' | 'autre';
export type LearningStatus = 'nouveau' | 'en_cours' | 'appris' | 'a_reviser';
export type Gender = 'masculin' | 'feminin' | 'invariable' | '';

export interface PersonForms {
  je?: string;
  tu?: string;
  'il/elle/on'?: string;
  nous?: string;
  vous?: string;
  'ils/elles'?: string;
}

export interface ImperatifForms {
  tu?: string;
  nous?: string;
  vous?: string;
}

/** Conjugaisons optionnelles, tense par tense */
export interface Conjugations {
  present?: PersonForms;
  passe_compose?: PersonForms;
  imparfait?: PersonForms;
  futur_simple?: PersonForms;
  futur_proche?: PersonForms;
  conditionnel_present?: PersonForms;
  subjonctif_present?: PersonForms;
  plus_que_parfait?: PersonForms;
  conditionnel_passe?: PersonForms;
  imperatif_present?: ImperatifForms;
  futur_anterieur?: PersonForms;
  subjonctif_passe?: PersonForms;
}

export const CONJUGATION_TENSES_PRIORITY = [
  { key: 'present', label: 'Présent' },
  { key: 'passe_compose', label: 'Passé composé' },
  { key: 'imparfait', label: 'Imparfait' },
  { key: 'futur_simple', label: 'Futur simple' },
  { key: 'futur_proche', label: 'Futur proche' },
  { key: 'conditionnel_present', label: 'Conditionnel présent' },
  { key: 'subjonctif_present', label: 'Subjonctif présent' },
] as const;

export const CONJUGATION_TENSES_LATER = [
  { key: 'plus_que_parfait', label: 'Plus-que-parfait' },
  { key: 'conditionnel_passe', label: 'Conditionnel passé' },
  { key: 'imperatif_present', label: 'Impératif présent' },
  { key: 'futur_anterieur', label: 'Futur antérieur' },
  { key: 'subjonctif_passe', label: 'Subjonctif passé' },
] as const;

export interface Word {
  id: number;
  userId?: number;
  word: string;
  category: Category;
  ipa: string;
  gender?: Gender;
  translations: {
    en: string;
    enExample?: string;
    es: string;
    esExample?: string;
  };
  definition?: string;
  /** Exemples en français uniquement */
  examples: string[];
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
  gender?: Gender;
  translations: {
    en: string;
    enExample?: string;
    es: string;
    esExample?: string;
  };
  definition?: string;
  examples: string[];
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
