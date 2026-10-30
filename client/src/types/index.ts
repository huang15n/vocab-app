export type Category = 'verbe' | 'nom' | 'adjectif' | 'expression' | 'adverbe' | 'autre'
export type LearningStatus = 'nouveau' | 'en_cours' | 'appris' | 'a_reviser'
export type Gender = 'masculin' | 'feminin' | 'invariable' | ''
export type Lang = 'fr' | 'en' | 'es'

export interface PersonForms {
  je?: string
  tu?: string
  'il/elle/on'?: string
  nous?: string
  vous?: string
  'ils/elles'?: string
}

export interface ImperatifForms {
  tu?: string
  nous?: string
  vous?: string
}

export interface Conjugations {
  present?: PersonForms
  passe_compose?: PersonForms
  imparfait?: PersonForms
  futur_simple?: PersonForms
  futur_proche?: PersonForms
  conditionnel_present?: PersonForms
  subjonctif_present?: PersonForms
  plus_que_parfait?: PersonForms
  conditionnel_passe?: PersonForms
  imperatif_present?: ImperatifForms
  futur_anterieur?: PersonForms
  subjonctif_passe?: PersonForms
}

export const CONJUGATION_TENSES_PRIORITY = [
  { key: 'present', label: 'Présent' },
  { key: 'passe_compose', label: 'Passé composé' },
  { key: 'imparfait', label: 'Imparfait' },
  { key: 'futur_simple', label: 'Futur simple' },
  { key: 'futur_proche', label: 'Futur proche' },
  { key: 'conditionnel_present', label: 'Conditionnel présent' },
  { key: 'subjonctif_present', label: 'Subjonctif présent' },
] as const

export const CONJUGATION_TENSES_LATER = [
  { key: 'plus_que_parfait', label: 'Plus-que-parfait' },
  { key: 'conditionnel_passe', label: 'Conditionnel passé' },
  { key: 'imperatif_present', label: 'Impératif présent' },
  { key: 'futur_anterieur', label: 'Futur antérieur' },
  { key: 'subjonctif_passe', label: 'Subjonctif passé' },
] as const

export const IELTS_LEVELS = ['4.0', '4.5', '5.0', '5.5', '6.0', '6.5', '7.0', '7.5', '8.0', '8.5', '9.0'] as const
export const CEFR_LEVELS = ['A1', 'A2', 'A2–B1', 'B1', 'B2', 'C1', 'C2'] as const

/** Entry in one language table (fr OR en OR es) */
export interface Word {
  id: number
  userId?: number
  lang?: Lang
  word: string
  ipa: string
  category: Category
  gender?: Gender
  level?: string
  levelSystem?: 'cefr' | 'ielts'
  learningStatus: LearningStatus
  definition?: string
  examples: string[]
  collocations: string[]
  synonyms: string[]
  antonyms: string[]
  tags: string[]
  glossFr?: string
  glossEn?: string
  glossEs?: string
  exampleFr?: string
  exampleEn?: string
  exampleEs?: string
  conjugations: Conjugations | null
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface WordFormData {
  word: string
  ipa: string
  category: Category
  gender?: Gender
  level?: string
  learningStatus: LearningStatus
  definition?: string
  examples: string[]
  collocations: string[]
  synonyms: string[]
  antonyms: string[]
  tags: string[]
  glossFr?: string
  glossEn?: string
  glossEs?: string
  exampleFr?: string
  exampleEn?: string
  exampleEs?: string
  conjugations: Conjugations | null
  notes?: string
}

export interface User {
  id: number
  email: string
  name: string
}

export interface StudySet {
  id: number
  userId: number
  lang: Lang
  name: string
  description: string
  wordIds: number[]
  wordCount?: number
  words?: Word[]
  createdAt: string
  updatedAt: string
}

export interface Progress {
  userId: number
  lang?: string
  wordId: number
  ease: number
  interval: number
  repetitions: number
  nextReview: string
  correctCount: number
  incorrectCount: number
  lastReviewed: string | null
  status: 'nouveau' | 'learning' | 'review' | 'mastered'
}

export interface Stats {
  total: number
  byCategory: Record<string, number>
  byStatus: Record<string, number>
  setsCount: number
  dueCount: number
  mastered: number
  totalReviews: number
  byLang?: Record<string, number>
}

export interface Flashcard {
  id: number
  front: string
  back: string
  back2?: string
  ipa: string
  category: string
  example: string
  progress: Progress
  lang?: string
}

export interface QuizQuestion {
  wordId: number
  prompt: string
  ipa: string
  type: 'mcq' | 'write'
  options?: string[]
  lang?: string
}
