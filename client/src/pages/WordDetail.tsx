import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { api } from '../api/words'
import type { Word, Conjugations, PersonForms } from '../types'
import {
  CONJUGATION_TENSES_PRIORITY,
  CONJUGATION_TENSES_LATER,
} from '../types'
import { useLang } from '../context/LanguageContext'
import { wordText, wordExample } from '../context/LanguageContext'

const statusLabels: Record<string, string> = {
  nouveau: 'Nouveau',
  en_cours: 'En cours',
  appris: 'Appris',
  a_reviser: 'À réviser',
}

const categoryLabels: Record<string, string> = {
  verbe: 'Verbe',
  nom: 'Nom',
  adjectif: 'Adjectif',
  expression: 'Expression',
  adverbe: 'Adverbe',
  autre: 'Autre',
}

const genderLabels: Record<string, string> = {
  masculin: 'Masculin',
  feminin: 'Féminin',
  invariable: 'Invariable',
}

export default function WordDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { lang, primary, t } = useLang()
  const [word, setWord] = useState<Word | null>(null)
  const [loading, setLoading] = useState(true)
  const [openTenses, setOpenTenses] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!id) return
    api
      .getWord(Number(id))
      .then(setWord)
      .catch(() => navigate('/words'))
      .finally(() => setLoading(false))
  }, [id, navigate])

  const handleDelete = async () => {
    if (!word || !confirm(`Supprimer « ${word.word} » ?`)) return
    await api.deleteWord(word.id)
    navigate('/words')
  }

  if (loading) return <div className="text-center py-20 text-slate-400">Chargement…</div>
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
            <h1 className="text-3xl font-bold text-slate-900">{primary(word) || word.fr || word.word}</h1>
            <span className="font-mono text-slate-400 text-lg">{word.ipa}</span>
          </div>
          <div className="flex gap-2 mt-1 flex-wrap">
            <span className="badge bg-slate-100 text-slate-700">
              {categoryLabels[word.category]}
              {word.category === 'nom' && word.gender
                ? ` · ${genderLabels[word.gender] || word.gender}`
                : ''}
            </span>
            <span className="badge bg-primary-50 text-primary-700">
              {statusLabels[word.learningStatus]}
            </span>
            {word.cefrLevel && (
              <span className="badge bg-violet-50 text-violet-700">{word.cefrLevel}</span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Link to={`/words/${word.id}/edit`} className="btn-secondary">
            <Edit className="w-4 h-4" />
            Modifier
          </Link>
          <button onClick={handleDelete} className="btn-danger">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Three languages */}
      <div className="card p-5">
        <h2 className="font-semibold text-slate-800 mb-3">{t('translations')}</h2>
        <div className="grid sm:grid-cols-3 gap-6">
          <div className={lang === 'fr' ? 'ring-2 ring-violet-300 rounded-lg p-2 -m-2' : ''}>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Français</p>
            <p className="text-slate-900 font-medium mt-0.5">{wordText(word, 'fr') || '—'}</p>
            {wordExample(word, 'fr') && (
              <p className="text-sm text-slate-500 italic mt-1">« {wordExample(word, 'fr')} »</p>
            )}
          </div>
          <div className={lang === 'en' ? 'ring-2 ring-violet-300 rounded-lg p-2 -m-2' : ''}>
            <p className="text-xs text-slate-500 uppercase tracking-wide">English</p>
            <p className="text-slate-900 font-medium mt-0.5">{wordText(word, 'en') || '—'}</p>
            {wordExample(word, 'en') && (
              <p className="text-sm text-slate-500 italic mt-1">« {wordExample(word, 'en')} »</p>
            )}
          </div>
          <div className={lang === 'es' ? 'ring-2 ring-violet-300 rounded-lg p-2 -m-2' : ''}>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Español</p>
            <p className="text-slate-900 font-medium mt-0.5">{wordText(word, 'es') || '—'}</p>
            {wordExample(word, 'es') && (
              <p className="text-sm text-slate-500 italic mt-1">« {wordExample(word, 'es')} »</p>
            )}
          </div>
        </div>
        {word.definition && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Définition</p>
            <p className="text-slate-700 mt-1">{word.definition}</p>
          </div>
        )}
      </div>

      {/* French examples */}
      {examples.length > 0 && (
        <div className="card p-5">
          <h2 className="font-semibold text-slate-800 mb-3">Exemples (français)</h2>
          <ul className="space-y-2">
            {examples.map((ex, i) => (
              <li key={i} className="border-l-2 border-primary-300 pl-3 text-slate-900">
                {ex}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Collocations / Syn / Ant */}
      <div className="grid sm:grid-cols-3 gap-4">
        {word.collocations?.length > 0 && (
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Collocations</h3>
            <ul className="space-y-1">
              {word.collocations.map((c, i) => (
                <li key={i} className="text-sm text-slate-600">• {c}</li>
              ))}
            </ul>
          </div>
        )}
        {word.synonyms?.length > 0 && (
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Synonymes</h3>
            <p className="text-sm text-slate-600">{word.synonyms.join(', ')}</p>
          </div>
        )}
        {word.antonyms?.length > 0 && (
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Antonymes</h3>
            <p className="text-sm text-slate-600">{word.antonyms.join(', ')}</p>
          </div>
        )}
      </div>

      {word.tags?.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {word.tags.map((t) => (
            <span key={t} className="badge bg-primary-50 text-primary-700">
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Conjugations */}
      {word.category === 'verbe' && filledTenses.length > 0 && (
        <div className="card p-5 space-y-2">
          <h2 className="font-semibold text-slate-800 mb-2">Conjugaison</h2>
          {filledTenses.map(({ key, label }) => {
            const forms = word.conjugations![key as keyof Conjugations] as PersonForms | Record<string, string>
            const open = openTenses[key] ?? false
            return (
              <div key={key} className="border border-slate-200 rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenTenses((o) => ({ ...o, [key]: !open }))}
                  className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50 text-left"
                >
                  <span className="font-medium text-sm">{label}</span>
                  {open ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                </button>
                {open && (
                  <table className="w-full text-sm">
                    <tbody>
                      {Object.entries(forms).map(([person, formVal]) =>
                        formVal ? (
                          <tr key={person} className="border-t border-slate-100">
                            <td className="py-2 px-3 text-slate-500 w-36 capitalize">{person}</td>
                            <td className="py-2 px-3 font-medium">{formVal}</td>
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
          <h3 className="text-sm font-semibold text-amber-800 mb-1">Notes</h3>
          <p className="text-sm text-amber-900">{word.notes}</p>
        </div>
      )}

      <p className="text-xs text-slate-400">
        Créé le {new Date(word.createdAt).toLocaleDateString('fr-FR')} · Mis à jour le{' '}
        {new Date(word.updatedAt).toLocaleDateString('fr-FR')}
      </p>
    </div>
  )
}
