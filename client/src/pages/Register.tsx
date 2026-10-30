import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LanguageContext'

export default function Register() {
  const { register } = useAuth()
  const { t, lang, setLang } = useLang()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(email, password, name)
      navigate('/')
    } catch (err: any) {
      setError(err.message || 'Error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center gap-1 mb-4">
          {(['fr', 'en', 'es'] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold uppercase ${
                lang === l ? 'bg-primary-600 text-white' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-primary-700 font-semibold text-xl">
            <BookOpen className="w-7 h-7" />
            {t('appName')}
          </div>
        </div>
        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 text-red-800 px-3 py-2 text-sm">
              {error}
            </div>
          )}
          <div>
            <label className="label">{t('name')}</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="label">{t('email')}</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">{t('password')}</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? '…' : t('register')}
          </button>
          <p className="text-center text-sm text-slate-500">
            <Link to="/login" className="text-primary-600 font-medium hover:underline">
              {t('login')}
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
