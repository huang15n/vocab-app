import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { translate, type Lang, type TranslationKey, LANG_LABELS } from '../i18n/translations'
import type { Word } from '../types'

interface LangCtx {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: TranslationKey) => string
  /** Mot principal selon la langue active */
  primary: (w: Word) => string
  /** Les deux autres langues */
  secondary: (w: Word) => { lang: Lang; text: string }[]
  primaryExample: (w: Word) => string
}

const LanguageContext = createContext<LangCtx | null>(null)

function getStored(): Lang {
  try {
    const v = localStorage.getItem('vocab_lang') as Lang | null
    if (v === 'fr' || v === 'en' || v === 'es') return v
    // migrate old keys
    const old = localStorage.getItem('vocab_ui_lang') as Lang | null
    if (old === 'fr' || old === 'en' || old === 'es') return old
  } catch {}
  return 'fr'
}

export function wordText(w: Word, lang: Lang): string {
  if (lang === 'fr') return w.fr || w.word || ''
  if (lang === 'en') return w.en || w.translations?.en || ''
  if (lang === 'es') return w.es || w.translations?.es || ''
  return ''
}

export function wordExample(w: Word, lang: Lang): string {
  if (lang === 'fr') {
    if (w.exampleFr) return w.exampleFr
    const ex = w.examples
    if (Array.isArray(ex) && ex.length) {
      const first = ex[0]
      return typeof first === 'string' ? first : (first as any)?.sentence || ''
    }
    return ''
  }
  if (lang === 'en') return w.exampleEn || w.translations?.enExample || ''
  if (lang === 'es') return w.exampleEs || w.translations?.esExample || ''
  return ''
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getStored)

  const setLang = (l: Lang) => {
    setLangState(l)
    localStorage.setItem('vocab_lang', l)
    document.documentElement.lang = l
  }

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const t = (key: TranslationKey) => translate(lang, key)

  const primary = (w: Word) => wordText(w, lang)

  const secondary = (w: Word) => {
    const others: Lang[] = (['fr', 'en', 'es'] as Lang[]).filter((l) => l !== lang)
    return others
      .map((l) => ({ lang: l, text: wordText(w, l) }))
      .filter((x) => x.text)
  }

  const primaryExample = (w: Word) => wordExample(w, lang)

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, primary, secondary, primaryExample }}>
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
