import { Routes, Route, NavLink, Navigate, Link } from 'react-router-dom'
import {
  BookOpen,
  Plus,
  LayoutDashboard,
  Layers,
  Upload,
  LogOut,
  User,
} from 'lucide-react'
import { useAuth } from './context/AuthContext'
import { useLang, LANG_LABELS } from './context/LanguageContext'
import type { Lang } from './i18n/translations'
import WordList from './pages/WordList'
import WordForm from './pages/WordForm'
import WordDetail from './pages/WordDetail'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Register from './pages/Register'
import ImportPage from './pages/Import'
import Sets from './pages/Sets'
import Flashcards from './pages/Flashcards'
import Quiz from './pages/Quiz'

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const { t } = useLang()
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-400">{t('loading')}</div>
  }
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function LangSwitch() {
  const { uiLang, studyLang, setUiLang, setStudyLang, t } = useLang()
  const langs: Lang[] = ['fr', 'en', 'es']
  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="hidden lg:flex items-center gap-1" title={t('uiLanguage')}>
        <span className="text-slate-400">UI</span>
        {langs.map((l) => (
          <button
            key={l}
            onClick={() => setUiLang(l)}
            className={`px-1.5 py-0.5 rounded font-medium uppercase ${
              uiLang === l ? 'bg-primary-100 text-primary-800' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            {l}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1" title={t('studyLanguageHint')}>
        <span className="text-slate-400 hidden sm:inline">{t('studyLanguage')}</span>
        {langs.map((l) => (
          <button
            key={l}
            onClick={() => setStudyLang(l)}
            className={`px-1.5 py-0.5 rounded font-medium uppercase ${
              studyLang === l ? 'bg-violet-100 text-violet-800' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  )
}

function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()
  const { t } = useLang()
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14 gap-2">
            <NavLink to="/" className="flex items-center gap-2 font-semibold text-primary-700 shrink-0">
              <BookOpen className="w-6 h-6" />
              <span className="hidden sm:inline">{t('appName')}</span>
            </NavLink>
            <nav className="flex items-center gap-0.5 flex-wrap justify-end">
              <LangSwitch />
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `btn-ghost text-xs sm:text-sm ${isActive ? 'bg-primary-50 text-primary-700' : ''}`
                }
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden md:inline">{t('home')}</span>
              </NavLink>
              <NavLink
                to="/words"
                className={({ isActive }) =>
                  `btn-ghost text-xs sm:text-sm ${isActive ? 'bg-primary-50 text-primary-700' : ''}`
                }
              >
                <BookOpen className="w-4 h-4" />
                <span className="hidden md:inline">{t('words')}</span>
              </NavLink>
              <NavLink
                to="/sets"
                className={({ isActive }) =>
                  `btn-ghost text-xs sm:text-sm ${isActive ? 'bg-primary-50 text-primary-700' : ''}`
                }
              >
                <Layers className="w-4 h-4" />
                <span className="hidden md:inline">{t('sets')}</span>
              </NavLink>
              <NavLink
                to="/import"
                className={({ isActive }) =>
                  `btn-ghost text-xs sm:text-sm ${isActive ? 'bg-primary-50 text-primary-700' : ''}`
                }
              >
                <Upload className="w-4 h-4" />
                <span className="hidden md:inline">{t('import')}</span>
              </NavLink>
              <Link to="/words/new" className="btn-primary ml-1 text-xs sm:text-sm">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">{t('add')}</span>
              </Link>
              <div className="ml-1 flex items-center gap-1 border-l border-slate-200 pl-2">
                <span className="hidden sm:flex items-center gap-1 text-xs text-slate-500">
                  <User className="w-3.5 h-3.5" />
                  {user?.name}
                </span>
                <button onClick={logout} className="btn-ghost text-slate-500" title={t('logout')}>
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </nav>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6">{children}</main>
      <footer className="border-t border-slate-200 py-4 text-center text-sm text-slate-500">
        {t('footer')}
      </footer>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/*"
        element={
          <Protected>
            <AppLayout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/words" element={<WordList />} />
                <Route path="/words/new" element={<WordForm />} />
                <Route path="/words/:id" element={<WordDetail />} />
                <Route path="/words/:id/edit" element={<WordForm />} />
                <Route path="/sets" element={<Sets />} />
                <Route path="/import" element={<ImportPage />} />
                <Route path="/study/:setId/flashcards" element={<Flashcards />} />
                <Route path="/study/:setId/quiz" element={<Quiz />} />
              </Routes>
            </AppLayout>
          </Protected>
        }
      />
    </Routes>
  )
}
