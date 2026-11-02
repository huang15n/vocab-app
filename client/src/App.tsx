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
import Themes from './pages/Themes'
import ThemeDetail from './pages/ThemeDetail'
import VisualWordDetail from './pages/VisualWordDetail'
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
  const { lang, setLang } = useLang()
  const langs: Lang[] = ['fr', 'en', 'es']
  return (
    <div className="flex items-center gap-0.5 text-xs border border-slate-200 rounded-lg p-0.5">
      {langs.map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`px-2.5 py-1 rounded-md font-semibold uppercase transition-colors ${
            lang === l
              ? 'bg-primary-600 text-white shadow-sm'
              : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          {l}
        </button>
      ))}
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
                to="/themes"
                className={({ isActive }) =>
                  `px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive ? 'bg-primary-100 text-primary-800' : 'text-slate-600 hover:bg-slate-100'
                  }`
                }
              >
                {t('themes')}
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
                <Route path="/themes" element={<Themes />} />
                <Route path="/themes/:id" element={<ThemeDetail />} />
                <Route path="/themes/:themeId/words/:wordId" element={<VisualWordDetail />} />
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
