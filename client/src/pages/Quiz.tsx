import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Check, X } from 'lucide-react'
import { api } from '../api/words'
import { useLang } from '../context/LanguageContext'
import type { QuizQuestion } from '../types'

export default function Quiz() {
  const { setId } = useParams()
  const { lang, t } = useLang()
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [setName, setSetName] = useState('')
  const [idx, setIdx] = useState(0)
  const [selected, setSelected] = useState('')
  const [written, setWritten] = useState('')
  const [feedback, setFeedback] = useState<{ correct: boolean; correctAnswer: string } | null>(null)
  const [score, setScore] = useState({ correct: 0, total: 0 })
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<'mcq' | 'write'>('mcq')
  const [finished, setFinished] = useState(false)

  useEffect(() => {
    if (!setId) return
    api
      .getQuiz(Number(setId), 15)
      .then((r) => {
        setQuestions(r.questions)
        setSetName(r.setName)
        setLoading(false)
      })
      .catch((e) => {
        console.error(e)
        setLoading(false)
      })
  }, [setId, lang])

  const q = questions[idx]

  const submit = async () => {
    if (!q) return
    const answer = mode === 'mcq' ? selected : written
    if (!answer) return
    const res = await api.checkAnswer(q.wordId, answer, mode, lang)
    setFeedback({ correct: res.correct, correctAnswer: res.correctAnswer })
    setScore((s) => ({
      correct: s.correct + (res.correct ? 1 : 0),
      total: s.total + 1,
    }))
  }

  const next = () => {
    setFeedback(null)
    setSelected('')
    setWritten('')
    if (idx + 1 >= questions.length) setFinished(true)
    else setIdx(idx + 1)
  }

  if (loading) return <div className="text-center py-20 text-slate-400">{t('loading')}</div>

  if (questions.length === 0) {
    return (
      <div className="text-center py-16 space-y-4">
        <p className="text-slate-500">{t('needTwoWords')}</p>
        <Link to={`/sets/${setId}`} className="btn-primary inline-flex">
          {t('cancel')}
        </Link>
      </div>
    )
  }

  if (finished) {
    const pct = Math.round((score.correct / score.total) * 100)
    return (
      <div className="max-w-md mx-auto text-center space-y-6 py-12">
        <h1 className="text-2xl font-bold">{t('quizDone')}</h1>
        <div className="card p-6">
          <p className="text-4xl font-bold text-primary-600">{pct}%</p>
          <p className="text-slate-600 mt-2">
            {score.correct} / {score.total} correctes
          </p>
        </div>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => {
              setIdx(0)
              setScore({ correct: 0, total: 0 })
              setFinished(false)
              setFeedback(null)
            }}
            className="btn-primary"
          >
            {t('restart')}
          </button>
          <Link to={`/sets/${setId}`} className="btn-secondary">
            {t('cancel')}
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
        <div className="text-center">
          <p className="font-medium text-slate-800">{setName}</p>
          <p className="text-xs text-slate-400">
            {idx + 1} / {questions.length}
          </p>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setMode('mcq')}
            className={`text-xs px-2 py-1 rounded ${mode === 'mcq' ? 'bg-primary-100 text-primary-800' : 'text-slate-500'}`}
          >
            {t('mcq')}
          </button>
          <button
            onClick={() => setMode('write')}
            className={`text-xs px-2 py-1 rounded ${mode === 'write' ? 'bg-primary-100 text-primary-800' : 'text-slate-500'}`}
          >
            {t('write')}
          </button>
        </div>
      </div>

      <div className="card p-6 space-y-4">
        <div className="text-center">
          <p className="text-xs text-slate-400 uppercase">{t('translate')}</p>
          <p className="text-3xl font-bold mt-1">{q.prompt}</p>
          <p className="font-mono text-slate-400 text-sm">{q.ipa}</p>
        </div>

        {mode === 'mcq' && q.options && (
          <div className="space-y-2">
            {q.options.map((opt) => (
              <button
                key={opt}
                disabled={!!feedback}
                onClick={() => setSelected(opt)}
                className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors ${
                  selected === opt
                    ? 'border-primary-500 bg-primary-50 text-primary-900'
                    : 'border-slate-200 hover:border-slate-300'
                } ${
                  feedback && opt === feedback.correctAnswer
                    ? 'border-emerald-500 bg-emerald-50'
                    : ''
                } ${
                  feedback && selected === opt && !feedback.correct
                    ? 'border-red-400 bg-red-50'
                    : ''
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {mode === 'write' && (
          <input
            className="input text-center text-lg"
            placeholder={t('writeAnswer')}
            value={written}
            onChange={(e) => setWritten(e.target.value)}
            disabled={!!feedback}
            onKeyDown={(e) => e.key === 'Enter' && !feedback && submit()}
            autoFocus
          />
        )}

        {feedback && (
          <div
            className={`rounded-lg px-4 py-3 text-sm flex items-center gap-2 ${
              feedback.correct
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {feedback.correct ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
            {feedback.correct ? t('correct') : `${t('incorrect')} ${feedback.correctAnswer}`}
          </div>
        )}

        {!feedback ? (
          <button
            onClick={submit}
            className="btn-primary w-full"
            disabled={mode === 'mcq' ? !selected : !written.trim()}
          >
            {t('validate')}
          </button>
        ) : (
          <button onClick={next} className="btn-primary w-full">
            {idx + 1 >= questions.length ? t('seeScore') : t('next')}
          </button>
        )}
      </div>

      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary-500 transition-all"
          style={{ width: `${((idx + (feedback ? 1 : 0)) / questions.length) * 100}%` }}
        />
      </div>
    </div>
  )
}
