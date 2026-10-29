import { Routes, Route, NavLink } from 'react-router-dom'
import { BookOpen, Plus, LayoutDashboard, Database } from 'lucide-react'
import WordList from './pages/WordList'
import WordForm from './pages/WordForm'
import WordDetail from './pages/WordDetail'
import Dashboard from './pages/Dashboard'

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <NavLink to="/" className="flex items-center gap-2 font-semibold text-primary-700">
              <BookOpen className="w-6 h-6" />
              <span>Vocabulaire FR</span>
            </NavLink>
            <nav className="flex items-center gap-1">
              <NavLink
                to="/"
                className={({ isActive }) =>
                  `btn-ghost ${isActive ? 'bg-primary-50 text-primary-700' : ''}`
                }
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden sm:inline">Tableau de bord</span>
              </NavLink>
              <NavLink
                to="/words"
                className={({ isActive }) =>
                  `btn-ghost ${isActive ? 'bg-primary-50 text-primary-700' : ''}`
                }
              >
                <BookOpen className="w-4 h-4" />
                <span className="hidden sm:inline">Mots</span>
              </NavLink>
              <NavLink to="/words/new" className="btn-primary ml-2">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Ajouter</span>
              </NavLink>
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/words" element={<WordList />} />
          <Route path="/words/new" element={<WordForm />} />
          <Route path="/words/:id" element={<WordDetail />} />
          <Route path="/words/:id/edit" element={<WordForm />} />
        </Routes>
      </main>

      <footer className="border-t border-slate-200 py-4 text-center text-sm text-slate-500">
        Vocabulaire FR — MERN Stack · Apprentissage des langues
      </footer>
    </div>
  )
}
