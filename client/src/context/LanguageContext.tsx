import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { translate, type Lang, type TranslationKey, LANG_LABELS } from '../i18n/translations'
import type { Word } from '../types'

interface LangCtx {
  uiLang: Lang
  studyLang: Lang
  setUiLang: (l: Lang) => void
  setStudyLang: (l: Lang) => void
  t: (key: TranslationKey) => string
  /** Mot principal selon la langue d'étude */
  primary: (w: Word) => string
  /** Traductions (les deux autres langues) */
  secondary: (w: Word) => { lang: Lang; text: string }[]
  /** Exemple selon langue d'étude */
  primaryExample: (w: Word) => string
}

const LanguageContext = createContext<LangCtx | null>(null)

function getStored(key: string, fallback: Lang): Lang {
  try {
    const v = localStorage.getItem(key) as Lang | null
    if (v === 'fr' || v === 'en' || v === 'es') return v
  } catch {}
  return fallback
}

/** Normalize legacy word shape → fr/en/es */
export function wordText(w: Word, lang: Lang): string {
  if (lang === 'fr') return w.fr || w.word || ''
  if (lang === 'en') return w.en || w.translations?.en || ''
  if (lang === 'es') return w.es || w.translations?.es || ''
  return ''
}

export function wordExample(w: Word, lang: Lang): string {
  if (lang === 'fr') {
    const ex = w.examples
    if (Array.isArray(ex) && ex.length) {
      const first = ex[0]
      return typeof first === 'string' ? first : (first as any)?.sentence || ''
    }
    return w.exampleFr || ''
  }
  if (lang === 'en') return w.exampleEn || w.translations?.enExample || ''
  if (lang === 'es') return w.exampleEs || w.translations?.esExample || ''
  return ''
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [uiLang, setUiLangState] = useState<Lang>(() => getStored('vocab_ui_lang', 'fr'))
  const [studyLang, setStudyLangState] = useState<Lang>(() => getStored('vocab_study_lang', 'fr'))

  const setUiLang = (l: Lang) => {
    setUiLangState(l)
    localStorage.setItem('vocab_ui_lang', l)
    document.documentElement.lang = l
  }

  const setStudyLang = (l: Lang) => {
    setStudyLangState(l)
    localStorage.setItem('vocab_study_lang', l)
  }

  useEffect(() => {
    document.documentElement.lang = uiLang
  }, [uiLang])

  const t = (key: TranslationKey) => translate(uiLang, key)

  const primary = (w: Word) => wordText(w, studyLang)

  const secondary = (w: Word) => {
    const others: Lang[] = (['fr', 'en', 'es'] as Lang[]).filter((l) => l !== studyLang)
    return others
      .map((lang) => ({ lang, text: wordText(w, lang) }))
      .filter((x) => x.text)
  }

  const primaryExample = (w: Word) => wordExample(w, studyLang)

  return (
    <LanguageContext.Provider
      value={{ uiLang, studyLang, setUiLang, setStudyLang, t, primary, secondary, primaryExample }}
    >
      {children}
    </LanguageContext.Provider>
  )
}

export function useLang() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLang must be used within LanguageProvider')
  return ctx
}

export { LANG_LABELS }
