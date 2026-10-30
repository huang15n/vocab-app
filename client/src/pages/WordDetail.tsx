import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { api } from '../api/words'
import { useLang } from '../context/LanguageContext'
import type { Word, Conjugations, PersonForms } from '../types'
import { CONJUGATION_TENSES_PRIORITY, CONJUGATION_TENSES_LATER } from '../types'

export default function WordDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { lang, t } = useLang()
  const [word, setWord] = useState<Word | null>(null)
  const [loading, setLoading] = useState(true)
  const [openTenses, setOpenTenses] = useState<Record<string, boolean>>({})

  const statusLabels: Record<string, string> = {
    nouveau: t('statusNew'),
    en_cours: t('statusLearning'),
    appris: t('statusLearned'),
    a_reviser: t('statusReview'),
  }
  const categoryLabels: Record<string, string> = {
    verbe: t('verb'),
    nom: t('noun'),
    adjectif: t('adjective'),
    expression: t('expression'),
    adverbe: t('adverb'),
    autre: t('other'),
  }
  const genderLabels: Record<string, string> = {
    masculin: t('masculine'),
    feminin: t('feminine'),
    invariable: t('invariable'),
  }

  useEffect(() => {
    if (!id) return
    setLoading(true)
    api
      .getWord(lang, Number(id))
      .then(setWord)
      .catch(() => navigate('/words'))
      .finally(() => setLoading(false))
  }, [id, lang, navigate])

  const handleDelete = async () => {
    if (!word || !confirm(`${t('confirmDelete')} « ${word.word} » ?`)) return
    await api.deleteWord(lang, word.id)
    navigate('/words')
  }

  if (loading) return <div className="text-center py-20 text-slate-400">{t('loading')}</div>
  if (!word) return null

  const examples = (word.examples || []).map((e: any) =>
    typeof e === 'string' ? e : e?.sentence || ''
  ).filter(Boolean)

  const allTenses = [...CONJUGATION_TENSES_PRIORITY, ...CONJUGATION_TENSES_LATER]
  const filledTenses = allTenses.filter(({ key }) => {
    const forms = word.conjugations?.[key as keyof Conjugations]
    return forms && typeof forms === 'object' && Object.values(forms).some((v) => v)
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/words" className="btn-ghost">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-baseline gap-3 flex-wrap">
            <h1 className="text-3xl font-bold">{word.word}</h1>
            {word.ipa && <span className="font-mono text-slate-400 text-lg">{word.ipa}</span>}
          </div>
          <div className="flex gap-2 mt-1 flex-wrap">
            <span className="badge bg-slate-100 text-slate-700">
              {categoryLabels[word.category]}
              {word.gender ? ` · ${genderLabels[word.gender] || word.gender}` : ''}
            </span>
            <span className="badge bg-primary-50 text-primary-700">
              {statusLabels[word.learningStatus]}
            </span>
            {word.level && (
              <span className="badge bg-violet-50 text-violet-700">
                {word.levelSystem === 'ielts' ? `IELTS ${word.level}` : word.level}
              </span>
            )}
            <span className="badge bg-slate-800 text-white uppercase text-[10px]">{lang}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Link to={`/words/${word.id}/edit`} className="btn-secondary">
            <Edit className="w-4 h-4" />
            {t('editWord')}
          </Link>
          <button onClick={handleDelete} className="btn-danger">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold mb-3">{t('translations')}</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {word.glossFr && (
            <div>
              <p className="text-xs text-slate-500 uppercase">FR</p>
              <p className="font-medium">{word.glossFr}</p>
              {word.exampleFr && <p className="text-sm text-slate-500 italic mt-1">« {word.exampleFr} »</p>}
            </div>
          )}
          {word.glossEn && (
            <div>
              <p className="text-xs text-slate-500 uppercase">EN</p>
              <p className="font-medium">{word.glossEn}</p>
              {word.exampleEn && <p className="text-sm text-slate-500 italic mt-1">« {word.exampleEn} »</p>}
            </div>
          )}
          {word.glossEs && (
            <div>
              <p className="text-xs text-slate-500 uppercase">ES</p>
              <p className="font-medium">{word.glossEs}</p>
              {word.exampleEs && <p className="text-sm text-slate-500 italic mt-1">« {word.exampleEs} »</p>}
            </div>
          )}
        </div>
        {word.definition && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-500 uppercase">{t('definition')}</p>
            <p className="mt-1">{word.definition}</p>
          </div>
        )}
      </div>

      {examples.length > 0 && (
        <div className="card p-5">
          <h2 className="font-semibold mb-3">{t('examplesFr')}</h2>
          <ul className="space-y-2">
            {examples.map((ex, i) => (
              <li key={i} className="border-l-2 border-primary-300 pl-3">{ex}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-4">
        {word.collocations?.length > 0 && (
          <div className="card p-4">
            <h3 className="text-sm font-semibold mb-2">{t('collocations')}</h3>
            <ul className="space-y-1 text-sm text-slate-600">
              {word.collocations.map((c, i) => (
                <li key={i}>• {c}</li>
              ))}
            </ul>
          </div>
        )}
        {word.synonyms?.length > 0 && (
          <div className="card p-4">
            <h3 className="text-sm font-semibold mb-2">{t('synonyms')}</h3>
            <p className="text-sm text-slate-600">{word.synonyms.join(', ')}</p>
          </div>
        )}
        {word.antonyms?.length > 0 && (
          <div className="card p-4">
            <h3 className="text-sm font-semibold mb-2">{t('antonyms')}</h3>
            <p className="text-sm text-slate-600">{word.antonyms.join(', ')}</p>
          </div>
        )}
      </div>

      {word.tags?.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {word.tags.map((tg) => (
            <span key={tg} className="badge bg-primary-50 text-primary-700">{tg}</span>
          ))}
        </div>
      )}

      {word.category === 'verbe' && filledTenses.length > 0 && (
        <div className="card p-5 space-y-2">
          <h2 className="font-semibold mb-2">{t('conjugations')}</h2>
          {filledTenses.map(({ key, label }) => {
            const forms = word.conjugations![key as keyof Conjugations] as PersonForms
            const open = openTenses[key] ?? false
            return (
              <div key={key} className="border border-slate-200 rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenTenses((o) => ({ ...o, [key]: !open }))}
                  className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50 text-left"
                >
                  <span className="font-medium text-sm">{label}</span>
                  {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                {open && (
                  <table className="w-full text-sm">
                    <tbody>
                      {Object.entries(forms).map(([person, val]) =>
                        val ? (
                          <tr key={person} className="border-t border-slate-100">
                            <td className="py-2 px-3 text-slate-500 w-36 capitalize">{person}</td>
                            <td className="py-2 px-3 font-medium">{val}</td>
                          </tr>
                        ) : null
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            )
          })}
        </div>
      )}

      {word.notes && (
        <div className="card p-4 bg-amber-50 border-amber-200">
          <h3 className="text-sm font-semibold text-amber-800 mb-1">{t('notes')}</h3>
          <p className="text-sm text-amber-900">{word.notes}</p>
        </div>
      )}
    </div>
  )
}
