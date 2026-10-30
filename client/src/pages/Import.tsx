import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Upload, ArrowLeft, FileSpreadsheet, CheckCircle } from 'lucide-react'
import { api } from '../api/words'
import { useLang } from '../context/LanguageContext'
import type { StudySet } from '../types'

export default function ImportPage() {
  const { t, lang } = useLang()
  const [file, setFile] = useState<File | null>(null)
  const [sets, setSets] = useState<StudySet[]>([])
  const [setId, setSetId] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ message: string; created: number; skipped: number } | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getSets(lang).then(setSets).catch(console.error)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await api.importFile(lang, file, setId ? Number(setId) : undefined)
      setResult(res)
      setFile(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/words" className="btn-ghost">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-2xl font-bold">{t('importTitle')}</h1>
      </div>

      <div className="card p-5 space-y-4">
        <p className="text-sm text-slate-600">{t('importHint')}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">{t('chooseFile')}</label>
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-primary-400 transition-colors">
              <FileSpreadsheet className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="text-sm"
              />
              {file && <p className="mt-2 text-sm text-primary-700 font-medium">{file.name}</p>}
            </div>
          </div>

          <div>
            <label className="label">{t('addToSet')}</label>
            <select className="input" value={setId} onChange={(e) => setSetId(e.target.value)}>
              <option value="">{t('none')}</option>
              {sets.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.wordCount ?? s.wordIds?.length ?? 0})
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 text-red-800 px-3 py-2 text-sm">
              {error}
            </div>
          )}
          {result && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-2 text-sm flex items-start gap-2">
              <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">{result.message}</p>
              </div>
            </div>
          )}

          <button type="submit" className="btn-primary w-full" disabled={!file || loading}>
            <Upload className="w-4 h-4" />
            {loading ? t('importing') : t('importBtn')}
          </button>
        </form>
      </div>

      <div className="card p-4 text-sm text-slate-600">
        <p className="font-medium text-slate-800 mb-2">CSV</p>
        <pre className="bg-slate-50 p-3 rounded-lg overflow-x-auto text-xs">
{`fr,en,es,ipa,category,gender,tags,cefr
poser,to ask,hacer una pregunta,/po.ze/,verbe,,communication,A2
maison,house,casa,/mɛ.zɔ̃/,nom,feminin,quotidien,A1`}
        </pre>
      </div>
    </div>
  )
}
