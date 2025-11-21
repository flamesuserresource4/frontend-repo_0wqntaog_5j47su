import { useState } from 'react'

const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

export default function AuthPanel({ onAuthed }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('demo@example.com')
  const [password, setPassword] = useState('password')
  const [name, setName] = useState('Demo User')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API}/auth/${mode === 'login' ? 'login' : 'register'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.detail || 'Failed')
      localStorage.setItem('token', data.access_token)
      onAuthed(data.access_token)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-slate-800/50 border border-blue-500/20 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold">{mode === 'login' ? 'Log in' : 'Create account'}</h3>
        <button className="text-blue-300 text-sm" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? 'Need an account?' : 'Have an account?'}
        </button>
      </div>
      <form onSubmit={submit} className="space-y-3">
        {mode === 'register' && (
          <input className="w-full bg-slate-900/60 border border-slate-700 rounded p-2 text-white" placeholder="Your name" value={name} onChange={(e)=>setName(e.target.value)} />
        )}
        <input className="w-full bg-slate-900/60 border border-slate-700 rounded p-2 text-white" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} />
        <input className="w-full bg-slate-900/60 border border-slate-700 rounded p-2 text-white" type="password" placeholder="Password" value={password} onChange={(e)=>setPassword(e.target.value)} />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded p-2 disabled:opacity-60">
          {loading ? 'Please wait...' : (mode === 'login' ? 'Log in' : 'Sign up')}
        </button>
      </form>
    </div>
  )
}
