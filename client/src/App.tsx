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
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-400">Chargement…</div>
  }
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <NavLink to="/" className="flex items-center gap-2 font-semibold text-primary-700">
              <BookOpen className="w-6 h-6" />
              <span className="hidden sm:inline">Vocabulaire FR</span>
            </NavLink>
            <nav className="flex items-center gap-0.5">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `btn-ghost text-xs sm:text-sm ${isActive ? 'bg-primary-50 text-primary-700' : ''}`
                }
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden md:inline">Accueil</span>
              </NavLink>
              <NavLink
                to="/words"
                className={({ isActive }) =>
                  `btn-ghost text-xs sm:text-sm ${isActive ? 'bg-primary-50 text-primary-700' : ''}`
                }
              >
                <BookOpen className="w-4 h-4" />
                <span className="hidden md:inline">Mots</span>
              </NavLink>
              <NavLink
                to="/sets"
                className={({ isActive }) =>
                  `btn-ghost text-xs sm:text-sm ${isActive ? 'bg-primary-50 text-primary-700' : ''}`
                }
              >
                <Layers className="w-4 h-4" />
                <span className="hidden md:inline">Ensembles</span>
              </NavLink>
              <NavLink
                to="/import"
                className={({ isActive }) =>
                  `btn-ghost text-xs sm:text-sm ${isActive ? 'bg-primary-50 text-primary-700' : ''}`
                }
              >
                <Upload className="w-4 h-4" />
                <span className="hidden md:inline">Import</span>
              </NavLink>
              <Link to="/words/new" className="btn-primary ml-1 text-xs sm:text-sm">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Ajouter</span>
              </Link>
              <div className="ml-2 flex items-center gap-1 border-l border-slate-200 pl-2">
                <span className="hidden sm:flex items-center gap-1 text-xs text-slate-500">
                  <User className="w-3.5 h-3.5" />
                  {user?.name}
                </span>
                <button onClick={logout} className="btn-ghost text-slate-500" title="Déconnexion">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </nav>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6">{children}</main>
      <footer className="border-t border-slate-200 py-4 text-center text-sm text-slate-500">
        Vocabulaire FR — Dictionnaire + Flashcards + Quiz
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
