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
  // subjonctif
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
}

export interface Stats {
  total: number;
  byCategory: Record<string, number>;
  byStatus: Record<string, number>;
}
