import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, RotateCcw, Check, X, Shuffle } from 'lucide-react'
import { api } from '../api/words'
import { useLang } from '../context/LanguageContext'
import type { Flashcard } from '../types'

export default function Flashcards() {
  const { setId } = useParams()
  const { lang, t } = useLang()
  const [cards, setCards] = useState<Flashcard[]>([])
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [loading, setLoading] = useState(true)
  const [done, setDone] = useState(false)
  const [stats, setStats] = useState({ known: 0, again: 0 })

  useEffect(() => {
    if (!setId) return
    api
      .getCards(Number(setId))
      .then((c) => {
        setCards([...c].sort(() => Math.random() - 0.5))
        setLoading(false)
      })
      .catch(console.error)
  }, [setId, lang])

  const card = cards[idx]

  const rate = async (quality: number) => {
    if (!card) return
    await api.review(card.id, quality, lang)
    if (quality >= 3) setStats((s) => ({ ...s, known: s.known + 1 }))
    else setStats((s) => ({ ...s, again: s.again + 1 }))
    setFlipped(false)
    if (idx + 1 >= cards.length) setDone(true)
    else setIdx(idx + 1)
  }

  const shuffle = () => {
    setCards((c) => [...c].sort(() => Math.random() - 0.5))
    setIdx(0)
    setFlipped(false)
    setDone(false)
    setStats({ known: 0, again: 0 })
  }

  if (loading) return <div className="text-center py-20 text-slate-400">{t('loading')}</div>

  if (cards.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-500">{t('emptySet')}</p>
        <Link to={`/sets/${setId}`} className="btn-primary mt-4 inline-flex">
          Retour
        </Link>
      </div>
    )
  }

  if (done) {
    return (
      <div className="max-w-md mx-auto text-center space-y-6 py-12">
        <h1 className="text-2xl font-bold">{t('sessionDone')}</h1>
        <div className="card p-6 space-y-2">
          <p className="text-emerald-600 font-medium">✓ Connus : {stats.known}</p>
          <p className="text-amber-600 font-medium">↻ {t('again')} : {stats.again}</p>
        </div>
        <div className="flex gap-3 justify-center">
          <button onClick={shuffle} className="btn-primary">
            <RotateCcw className="w-4 h-4" /> {t('restart')}
          </button>
          <Link to={`/sets/${setId}`} className="btn-secondary">
            {t('backToSet')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link to={`/sets/${setId}`} className="btn-ghost">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <span className="text-sm text-slate-500">
          {idx + 1} / {cards.length}
        </span>
        <button onClick={shuffle} className="btn-ghost" title="Mélanger">
          <Shuffle className="w-4 h-4" />
        </button>
      </div>

      <div
        onClick={() => setFlipped(!flipped)}
        className="card min-h-[280px] flex flex-col items-center justify-center p-8 cursor-pointer select-none hover:shadow-md transition-shadow"
      >
        {!flipped ? (
          <>
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Mot</p>
            <p className="text-3xl font-bold text-slate-900 text-center">{card.front}</p>
            <p className="font-mono text-slate-400 mt-2">{card.ipa}</p>
            <p className="text-xs text-slate-400 mt-6">{t('clickFlip')}</p>
          </>
        ) : (
          <>
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">{t('translations')}</p>
            <p className="text-2xl font-semibold text-primary-700 text-center">{card.back}</p>
            {card.back2 && (
              <p className="text-lg text-slate-600 text-center mt-2">{card.back2}</p>
            )}
            {card.example && (
              <p className="text-sm text-slate-500 mt-4 italic text-center">« {card.example} »</p>
            )}
          </>
        )}
      </div>

      {flipped && (
        <div className="flex gap-3">
          <button onClick={() => rate(1)} className="btn flex-1 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200">
            <X className="w-4 h-4" /> {t('again')}
          </button>
          <button onClick={() => rate(4)} className="btn flex-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200">
            <Check className="w-4 h-4" /> {t('known')}
          </button>
        </div>
      )}

      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary-500 transition-all"
          style={{ width: `${((idx + (flipped ? 0.5 : 0)) / cards.length) * 100}%` }}
        />
      </div>
    </div>
  )
}
