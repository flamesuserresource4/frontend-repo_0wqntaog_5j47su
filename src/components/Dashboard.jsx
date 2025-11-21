import { useEffect, useMemo, useState } from 'react'

const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

function useAuthHeaders(token) {
  return useMemo(() => token ? { Authorization: `Bearer ${token}` } : {}, [token])
}

function PlayerRow({ p, onSelect }) {
  return (
    <button onClick={() => onSelect(p)} className="w-full text-left grid grid-cols-6 gap-2 p-3 rounded hover:bg-slate-800/70 border border-slate-800">
      <div className="col-span-2 flex items-center gap-2">
        <img src={p.image_url || '/placeholder-player.png'} className="w-8 h-8 rounded object-cover" />
        <div>
          <div className="text-white text-sm font-medium">{p.name}</div>
          <div className="text-xs text-blue-300/70">{p.team}</div>
        </div>
      </div>
      <div className="text-blue-200 text-sm">{p.position || '-'}</div>
      <div className="text-blue-200 text-sm">{p.cwc_status || '-'}</div>
      <div className="text-blue-200 text-sm">${p.price?.toFixed(2) || '-'}</div>
      <div className="text-blue-200 text-sm">{p.momentum_score?.toFixed(2) || '0.00'}</div>
    </button>
  )
}

export default function Dashboard({ token }) {
  const [players, setPlayers] = useState([])
  const [tab, setTab] = useState('market')
  const [selected, setSelected] = useState(null)
  const [portfolio, setPortfolio] = useState(null)
  const [chat, setChat] = useState([])
  const [chatText, setChatText] = useState('')

  const headers = useAuthHeaders(token)

  async function fetchPlayers() {
    const res = await fetch(`${API}/players`)
    const data = await res.json()
    // Attach latest price per player
    const withPrice = await Promise.all(data.map(async (p) => {
      const r = await fetch(`${API}/players/${p.id}/prices?limit=1`)
      const ticks = await r.json()
      return { ...p, price: ticks?.[0]?.price }
    }))
    setPlayers(withPrice)
  }

  async function fetchPortfolio() {
    const res = await fetch(`${API}/portfolio`, { headers })
    if (res.ok) setPortfolio(await res.json())
  }

  async function fetchChat() {
    const res = await fetch(`${API}/chat`)
    if (res.ok) setChat(await res.json())
  }

  useEffect(() => {
    fetchPlayers()
    fetchChat()
    const t1 = setInterval(fetchPlayers, 10000)
    const t2 = setInterval(fetchChat, 5000)
    return () => { clearInterval(t1); clearInterval(t2) }
  }, [])

  useEffect(() => {
    if (token) fetchPortfolio()
  }, [token])

  async function sendChat(e) {
    e.preventDefault()
    if (!chatText.trim()) return
    await fetch(`${API}/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify({ message: chatText }) })
    setChatText('')
    fetchChat()
  }

  async function trade(side, player, quantity) {
    const res = await fetch(`${API}/trade`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify({ side, player_id: player.id, quantity }) })
    const data = await res.json()
    if (!res.ok) {
      alert(data?.detail || 'Trade failed')
      return
    }
    await fetchPortfolio()
    await fetchPlayers()
    alert(`Order confirmed: ${side} ${quantity} ${player.name} @ $${data.price}`)
  }

  function Market() {
    return (
      <div className="space-y-3">
        {players.map(p => <PlayerRow key={p.id} p={p} onSelect={setSelected} />)}
      </div>
    )
  }

  function PortfolioView() {
    if (!token) return <p className="text-blue-200">Log in to view your portfolio.</p>
    if (!portfolio) return <p className="text-blue-200">Loading...</p>
    return (
      <div className="space-y-2">
        <div className="text-blue-200">Cash: ${portfolio.cash.toFixed(2)} • Equity: ${portfolio.equity.toFixed(2)}</div>
        {portfolio.positions.map((pos) => (
          <div key={pos.player_id} className="p-3 rounded bg-slate-800/60 border border-slate-800">
            <div className="text-white text-sm">{pos.player_name}</div>
            <div className="text-blue-300 text-xs">Qty {pos.quantity} • Avg ${pos.avg_price} • Price ${pos.price} • P/L ${pos.pnl}</div>
          </div>
        ))}
      </div>
    )
  }

  function Chat() {
    return (
      <div className="space-y-3">
        <div className="space-y-2 max-h-72 overflow-auto pr-2">
          {chat.map((m) => (
            <div key={m.id} className="p-2 rounded bg-slate-800/60 border border-slate-800 text-blue-100 text-sm">{m.message}</div>
          ))}
        </div>
        <form onSubmit={sendChat} className="flex gap-2">
          <input value={chatText} onChange={(e)=>setChatText(e.target.value)} className="flex-1 bg-slate-900/60 border border-slate-700 rounded p-2 text-white" placeholder="Say something" />
          <button className="bg-blue-600 hover:bg-blue-500 text-white rounded px-4">Send</button>
        </form>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div className="flex gap-2">
          {['market','portfolio','chat'].map(t => (
            <button key={t} onClick={()=>setTab(t)} className={`px-3 py-1 rounded ${tab===t ? 'bg-blue-600 text-white' : 'bg-slate-800/60 text-blue-200'}`}>{t[0].toUpperCase()+t.slice(1)}</button>
          ))}
        </div>
        <div>
          {tab === 'market' && <Market />}
          {tab === 'portfolio' && <PortfolioView />}
          {tab === 'chat' && <Chat />}
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-slate-800/50 border border-blue-500/20 rounded-2xl p-4">
          <h3 className="text-white font-semibold mb-3">Selected</h3>
          {selected ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <img src={selected.image_url || '/placeholder-player.png'} className="w-10 h-10 rounded object-cover" />
                <div>
                  <div className="text-white text-sm">{selected.name}</div>
                  <div className="text-blue-300 text-xs">{selected.team}</div>
                </div>
              </div>
              <div className="text-blue-200 text-sm">Price: ${selected.price?.toFixed(2) || '-'}</div>
              {token ? (
                <div className="flex gap-2">
                  <button onClick={()=>trade('buy', selected, 1)} className="flex-1 bg-green-600 hover:bg-green-500 text-white rounded p-2">Buy 1</button>
                  <button onClick={()=>trade('sell', selected, 1)} className="flex-1 bg-red-600 hover:bg-red-500 text-white rounded p-2">Sell 1</button>
                </div>
              ) : (
                <p className="text-blue-300 text-xs">Log in to trade</p>
              )}
            </div>
          ) : (
            <p className="text-blue-300 text-sm">Select a player to trade</p>
          )}
        </div>
      </div>
    </div>
  )
}
