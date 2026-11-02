import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Trash2, Image as ImageIcon } from 'lucide-react'
import { api } from '../api/words'
import { useLang } from '../context/LanguageContext'

type Sub = { id?: number; nameFr: string; nameEn: string; nameEs: string }
type Theme = {
  id: number
  nameFr: string
  nameEn: string
  nameEs: string
  icon?: string
  subcategories: Sub[]
  wordCounts?: { fr: number; en: number; es: number }
}

function themeTitle(t: Theme, lang: string) {
  if (lang === 'en') return t.nameEn || t.nameFr || t.nameEs
  if (lang === 'es') return t.nameEs || t.nameFr || t.nameEn
  return t.nameFr || t.nameEn || t.nameEs
}

export default function Themes() {
  const { t, lang } = useLang()
  const [themes, setThemes] = useState<Theme[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [nameFr, setNameFr] = useState('')
  const [nameEn, setNameEn] = useState('')
  const [nameEs, setNameEs] = useState('')
  const [icon, setIcon] = useState('🏠')
  const [subs, setSubs] = useState<Sub[]>([{ nameFr: '', nameEn: '', nameEs: '' }])
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    api
      .getThemes()
      .then(setThemes)
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.createTheme({
        nameFr,
        nameEn,
        nameEs,
        icon,
        subcategories: subs.filter((s) => s.nameFr || s.nameEn || s.nameEs),
      })
      setShowForm(false)
      setNameFr('')
      setNameEn('')
      setNameEs('')
      setSubs([{ nameFr: '', nameEn: '', nameEs: '' }])
      load()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: number, title: string) => {
    if (!confirm(`${t('confirmDelete')} « ${title} » ?`)) return
    await api.deleteTheme(id)
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('themes')}</h1>
          <p className="text-sm text-slate-500">{t('visualDict')}</p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4" /> {t('addTheme')}
        </button>
      </div>

      {showForm && (
        <form onSubmit={create} className="card p-5 space-y-4">
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="label">Nom FR *</label>
              <input className="input" value={nameFr} onChange={(e) => setNameFr(e.target.value)} required />
            </div>
            <div>
              <label className="label">Name EN</label>
              <input className="input" value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
            </div>
            <div>
              <label className="label">Nombre ES</label>
              <input className="input" value={nameEs} onChange={(e) => setNameEs(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Icon (emoji)</label>
            <input className="input w-24 text-center text-xl" value={icon} onChange={(e) => setIcon(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="label">{t('subcategories')}</label>
            {subs.map((s, i) => (
              <div key={i} className="grid sm:grid-cols-3 gap-2">
                <input
                  className="input"
                  placeholder="Sous-catégorie FR"
                  value={s.nameFr}
                  onChange={(e) => {
                    const n = [...subs]
                    n[i] = { ...n[i], nameFr: e.target.value }
                    setSubs(n)
                  }}
                />
                <input
                  className="input"
                  placeholder="Subcategory EN"
                  value={s.nameEn}
                  onChange={(e) => {
                    const n = [...subs]
                    n[i] = { ...n[i], nameEn: e.target.value }
                    setSubs(n)
                  }}
                />
                <input
                  className="input"
                  placeholder="Subcategoría ES"
                  value={s.nameEs}
                  onChange={(e) => {
                    const n = [...subs]
                    n[i] = { ...n[i], nameEs: e.target.value }
                    setSubs(n)
                  }}
                />
              </div>
            ))}
            <button
              type="button"
              className="btn-ghost text-sm"
              onClick={() => setSubs([...subs, { nameFr: '', nameEn: '', nameEs: '' }])}
            >
              + {t('subcategories')}
            </button>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
              {t('cancel')}
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? t('saving') : t('save')}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-16 text-slate-400">{t('loading')}</div>
      ) : themes.length === 0 ? (
        <div className="card p-12 text-center text-slate-500">
          <ImageIcon className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p>{t('noThemes')}</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {themes.map((th) => {
            const title = themeTitle(th, lang)
            const count = th.wordCounts?.[lang as 'fr' | 'en' | 'es'] ?? 0
            return (
              <div key={th.id} className="card p-0 overflow-hidden hover:shadow-md transition-shadow">
                <Link to={`/themes/${th.id}`} className="block p-5">
                  <div className="text-4xl mb-3">{th.icon || '📚'}</div>
                  <h2 className="font-semibold text-lg text-slate-900">{title}</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    {(th.subcategories || []).length} {t('subcategories').toLowerCase()} · {count}{' '}
                    {t('words').toLowerCase()}
                  </p>
                  {(th.subcategories || []).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {(th.subcategories || []).slice(0, 4).map((s) => (
                        <span key={s.id || s.nameFr} className="badge bg-violet-50 text-violet-700 text-xs">
                          {lang === 'en' ? s.nameEn || s.nameFr : lang === 'es' ? s.nameEs || s.nameFr : s.nameFr || s.nameEn}
                        </span>
                      ))}
                    </div>
                  )}
                </Link>
                <div className="px-5 pb-4 flex justify-end">
                  <button
                    type="button"
                    className="btn-ghost text-red-500 text-sm"
                    onClick={() => remove(th.id, title)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
