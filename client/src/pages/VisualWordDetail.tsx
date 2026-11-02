import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Trash2, Image as ImageIcon } from 'lucide-react'
import { api } from '../api/words'
import { useLang } from '../context/LanguageContext'

export default function VisualWordDetail() {
  const { themeId, wordId } = useParams()
  const navigate = useNavigate()
  const { t, lang } = useLang()
  const [w, setW] = useState<any>(null)

  useEffect(() => {
    if (!wordId) return
    api
      .getVisualWord(lang, Number(wordId))
      .then(setW)
      .catch(() => navigate(`/themes/${themeId}`))
  }, [wordId, lang])

  const del = async () => {
    if (!w || !confirm(`${t('confirmDelete')} « ${w.word} » ?`)) return
    await api.deleteVisual(lang, w.id)
    navigate(`/themes/${themeId}`)
  }

  if (!w) return <div className="text-center py-20 text-slate-400">{t('loading')}</div>

  const examples = (w.examples || []).map((e: any) => (typeof e === 'string' ? e : '')).filter(Boolean)

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to={`/themes/${themeId}`} className="btn-ghost">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-2xl font-bold flex-1">{w.word}</h1>
        <button type="button" className="btn-danger" onClick={del}>
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="aspect-video bg-slate-100 flex items-center justify-center">
          {w.imageUrl ? (
            <img src={w.imageUrl} alt={w.word} className="w-full h-full object-contain" />
          ) : (
            <ImageIcon className="w-16 h-16 text-slate-300" />
          )}
        </div>
        <div className="p-5 space-y-3">
          {w.ipa && <p className="font-mono text-slate-500">{w.ipa}</p>}
          <p className="text-slate-800">{w.definition}</p>
          <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            {w.glossEn && (
              <div>
                <p className="text-xs uppercase text-slate-400">EN</p>
                <p className="font-medium">{w.glossEn}</p>
                {w.exampleEn && <p className="text-sm italic text-slate-500 mt-1">« {w.exampleEn} »</p>}
              </div>
            )}
            {w.glossEs && (
              <div>
                <p className="text-xs uppercase text-slate-400">ES</p>
                <p className="font-medium">{w.glossEs}</p>
                {w.exampleEs && <p className="text-sm italic text-slate-500 mt-1">« {w.exampleEs} »</p>}
              </div>
            )}
            {w.glossFr && (
              <div>
                <p className="text-xs uppercase text-slate-400">FR</p>
                <p className="font-medium">{w.glossFr}</p>
                {w.exampleFr && <p className="text-sm italic text-slate-500 mt-1">« {w.exampleFr} »</p>}
              </div>
            )}
          </div>
          {examples.length > 0 && (
            <ul className="space-y-1 pt-2">
              {examples.map((ex: string, i: number) => (
                <li key={i} className="border-l-2 border-primary-300 pl-3 text-sm">
                  {ex}
                </li>
              ))}
            </ul>
          )}
          {w.notes && (
            <p className="text-sm bg-amber-50 border border-amber-100 rounded-lg p-3 text-amber-900">{w.notes}</p>
          )}
        </div>
      </div>
    </div>
  )
}
