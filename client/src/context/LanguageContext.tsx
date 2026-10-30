import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { translate, type Lang, type TranslationKey, LANG_LABELS } from '../i18n/translations'
import type { Word } from '../types'

interface LangCtx {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: TranslationKey) => string
  primary: (w: Word) => string
  secondary: (w: Word) => { lang: Lang; text: string }[]
  primaryExample: (w: Word) => string
}

const LanguageContext = createContext<LangCtx | null>(null)

function getStored(): Lang {
  try {
    const v = localStorage.getItem('vocab_lang') as Lang | null
    if (v === 'fr' || v === 'en' || v === 'es') return v
  } catch {}
  return 'fr'
}

export function wordText(w: Word, _lang: Lang): string {
  return w.word || ''
}

export function wordExample(w: Word, lang: Lang): string {
  if (lang === 'fr') return w.exampleFr || (typeof w.examples?.[0] === 'string' ? w.examples[0] : '') || ''
  if (lang === 'en') return w.exampleEn || (typeof w.examples?.[0] === 'string' ? w.examples[0] : '') || ''
  if (lang === 'es') return w.exampleEs || (typeof w.examples?.[0] === 'string' ? w.examples[0] : '') || ''
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
  const primary = (w: Word) => w.word || ''
  const secondary = (w: Word) => {
    const out: { lang: Lang; text: string }[] = []
    if (w.glossFr) out.push({ lang: 'fr', text: w.glossFr })
    if (w.glossEn) out.push({ lang: 'en', text: w.glossEn })
    if (w.glossEs) out.push({ lang: 'es', text: w.glossEs })
    return out.filter((x) => x.text !== w.word)
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
