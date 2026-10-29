import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit, Trash2, Copy, Check } from 'lucide-react'
import { api } from '../api/words'
import type { Word, Conjugations, PersonForms } from '../types'
import ConjugationTable from '../components/ConjugationTable'

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

export default function WordDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [word, setWord] = useState<Word | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [activeMode, setActiveMode] = useState('indicatif')
  const [activeTense, setActiveTense] = useState('present')

  useEffect(() => {
    if (!id) return
    api
      .getWord(Number(id))
      .then((w) => {
        setWord(w)
        if (w.conjugations?.indicatif) {
          const tenses = Object.keys(w.conjugations.indicatif)
          if (tenses.length) setActiveTense(tenses[0])
        }
      })
      .catch(() => navigate('/words'))
      .finally(() => setLoading(false))
  }, [id, navigate])

  const handleDelete = async () => {
    if (!word || !confirm(`Supprimer « ${word.word} » ?`)) return
    await api.deleteWord(word.id)
    navigate('/words')
  }

  const copyConjugation = () => {
    if (!word?.conjugations) return
    const mode = word.conjugations[activeMode as keyof Conjugations] as any
    if (!mode) return
    const tense = mode[activeTense]
    if (!tense || typeof tense === 'string') return
    const lines = Object.entries(tense as PersonForms)
      .map(([p, f]) => `${p}\t${f}`)
      .join('\n')
    navigator.clipboard.writeText(lines)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return <div className="text-center py-20 text-slate-400">Chargement…</div>
  if (!word) return null

  const modes = word.conjugations
    ? (Object.keys(word.conjugations) as (keyof Conjugations)[]).filter(
        (m) => word.conjugations![m]
      )
    : []

  const currentModeData = word.conjugations?.[activeMode as keyof Conjugations] as
    | Record<string, PersonForms | string>
    | undefined

  const tenses =
    currentModeData && typeof currentModeData === 'object'
      ? Object.keys(currentModeData).filter((k) => typeof currentModeData[k] === 'object')
      : []

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/words" className="btn-ghost">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-baseline gap-3 flex-wrap">
            <h1 className="text-3xl font-bold text-slate-900">{word.word}</h1>
            <span className="font-mono text-slate-400 text-lg">{word.ipa}</span>
          </div>
          <div className="flex gap-2 mt-1 flex-wrap">
            <span className="badge bg-slate-100 text-slate-700">
              {categoryLabels[word.category]}
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

      {/* Translations */}
      <div className="card p-5">
        <h2 className="font-semibold text-slate-800 mb-3">Traductions</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Anglais</p>
            <p className="text-slate-900">{word.translations.en || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Espagnol</p>
            <p className="text-slate-900">{word.translations.es || '—'}</p>
          </div>
        </div>
        {word.definition && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Définition</p>
            <p className="text-slate-700 mt-1">{word.definition}</p>
          </div>
        )}
      </div>

      {/* Examples */}
      {word.examples.length > 0 && (
        <div className="card p-5">
          <h2 className="font-semibold text-slate-800 mb-3">Exemples</h2>
          <ul className="space-y-3">
            {word.examples.map((ex, i) => (
              <li key={i} className="border-l-2 border-primary-300 pl-3">
                <p className="text-slate-900">{ex.sentence}</p>
                <p className="text-slate-500 text-sm italic">{ex.translation}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Collocations / Synonyms / Antonyms */}
      <div className="grid sm:grid-cols-3 gap-4">
        {word.collocations.length > 0 && (
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Collocations</h3>
            <ul className="space-y-1">
              {word.collocations.map((c, i) => (
                <li key={i} className="text-sm text-slate-600">• {c}</li>
              ))}
            </ul>
          </div>
        )}
        {word.synonyms.length > 0 && (
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Synonymes</h3>
            <p className="text-sm text-slate-600">{word.synonyms.join(', ')}</p>
          </div>
        )}
        {word.antonyms.length > 0 && (
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Antonymes</h3>
            <p className="text-sm text-slate-600">{word.antonyms.join(', ')}</p>
          </div>
        )}
      </div>

      {/* Tags */}
      {word.tags.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {word.tags.map((t) => (
            <span key={t} className="badge bg-primary-50 text-primary-700">
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Conjugations - only for verbs */}
      {word.category === 'verbe' && word.conjugations && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800">Conjugaison</h2>
            <button onClick={copyConjugation} className="btn-ghost text-xs">
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copié' : 'Copier'}
            </button>
          </div>

          {/* Mode tabs */}
          <div className="flex flex-wrap gap-1 mb-4 border-b border-slate-200 pb-2">
            {modes.map((m) => (
              <button
                key={m}
                onClick={() => {
                  setActiveMode(m)
                  const data = word.conjugations![m] as any
                  if (data && typeof data === 'object') {
                    const first = Object.keys(data).find((k) => typeof data[k] === 'object')
                    if (first) setActiveTense(first)
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                  activeMode === m
                    ? 'bg-primary-100 text-primary-800'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Tense tabs */}
          {tenses.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-4">
              {tenses.map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveTense(t)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    activeTense === t
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {t.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          )}

          {/* Table */}
          {currentModeData && currentModeData[activeTense] && typeof currentModeData[activeTense] === 'object' ? (
            <ConjugationTable forms={currentModeData[activeTense] as PersonForms} />
          ) : currentModeData && typeof currentModeData === 'object' && !tenses.length ? (
            // infinitif / participe / gerondif
            <div className="grid grid-cols-2 gap-4 text-sm">
              {Object.entries(currentModeData).map(([k, v]) =>
                typeof v === 'string' ? (
                  <div key={k}>
                    <span className="text-slate-500 capitalize">{k.replace(/_/g, ' ')} : </span>
                    <span className="font-medium">{v}</span>
                  </div>
                ) : null
              )}
            </div>
          ) : (
            <p className="text-slate-400 text-sm">Aucune forme pour ce temps.</p>
          )}
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
