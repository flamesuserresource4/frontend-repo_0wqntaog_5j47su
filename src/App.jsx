import { useEffect, useState } from 'react'
import Header from './components/Header'
import AuthPanel from './components/AuthPanel'
import Dashboard from './components/Dashboard'

function App() {
  const [view, setView] = useState('market')
  const [token, setToken] = useState(localStorage.getItem('token') || '')
  const [me, setMe] = useState(null)

  const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

  useEffect(() => {
    async function loadMe() {
      if (!token) { setMe(null); return }
      const res = await fetch(`${API}/me`, { headers: { Authorization: `Bearer ${token}` }})
      if (res.ok) setMe(await res.json())
    }
    loadMe()
  }, [token])

  function onLogout() {
    localStorage.removeItem('token')
    setToken('')
    setMe(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-blue-100">
      <Header onNavigate={setView} />

      <main className="relative max-w-6xl mx-auto px-4 py-8 space-y-6">
        <section className="bg-slate-800/50 backdrop-blur-sm border border-blue-500/20 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold text-white">PlayerStock</h2>
            <div className="flex items-center gap-3">
              {me ? (
                <>
                  <span className="text-sm text-blue-300">Hi, {me.name}</span>
                  <button onClick={onLogout} className="text-sm bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded">Logout</button>
                </>
              ) : null}
            </div>
          </div>

          {!me && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <AuthPanel onAuthed={setToken} />
              <div className="bg-slate-900/40 border border-blue-500/10 rounded-2xl p-6">
                <h3 className="text-white font-semibold mb-2">How it works</h3>
                <ul className="list-disc pl-5 text-sm text-blue-200/90 space-y-1">
                  <li>Sign up and fund your wallet (demo uses manual balance updates)</li>
                  <li>Browse players and monitor real-time prices</li>
                  <li>Buy and sell to build your portfolio</li>
                  <li>Chat with the community in the global room</li>
                </ul>
              </div>
            </div>
          )}

          <div className="mt-6">
            <Dashboard token={token} />
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
