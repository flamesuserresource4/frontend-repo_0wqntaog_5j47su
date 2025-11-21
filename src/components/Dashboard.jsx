import { useEffect, useMemo, useState } from 'react'
import { connectTicks, connectChat } from './RealtimeClient'

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

  // Admin state
  const [q, setQ] = useState('')
  const [creating, setCreating] = useState(false)
  const [newPlayer, setNewPlayer] = useState({ name: '', team: '', nationality: '', position: '', cwc_status: '', image_url: '' })
  const [tickPrice, setTickPrice] = useState('')
  const [tickEvent, setTickEvent] = useState('')
  const [depositAmt, setDepositAmt] = useState('100')

  const headers = useAuthHeaders(token)

  async function fetchPlayers(search) {
    const res = await fetch(`${API}/players${search ? `?q=${encodeURIComponent(search)}` : ''}`)
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

    // WebSocket live updates
    const wsTicks = connectTicks(API, (msg) => {
      const { player_id, price } = msg
      setPlayers((prev) => prev.map(p => p.id === player_id ? { ...p, price } : p))
      setSelected((sel) => sel && sel.id === player_id ? { ...sel, price } : sel)
    })
    const wsChat = connectChat(API, (msg) => {
      if (msg?.message) setChat((prev) => [...prev, { id: msg.id || Math.random().toString(36), message: msg.message }])
    })

    // Fallback polling (light)
    const t1 = setInterval(() => fetchPlayers(q), 30000)

    return () => { wsTicks.close(); wsChat.close(); clearInterval(t1) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (token) fetchPortfolio()
  }, [token])

  async function sendChat(e) {
    e.preventDefault()
    if (!chatText.trim()) return
    await fetch(`${API}/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify({ message: chatText }) })
    setChatText('')
    // WS will deliver to everyone (including sender). No manual fetch needed.
  }

  async function trade(side, player, quantity) {
    const res = await fetch(`${API}/trade`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify({ side, player_id: player.id, quantity }) })
    const data = await res.json()
    if (!res.ok) {
      alert(data?.detail || 'Trade failed')
      return
    }
    await fetchPortfolio()
    // Price updates will continue via WS
    alert(`Order confirmed: ${side} ${quantity} ${player.name} @ $${data.price}`)
  }

  // Admin helpers
  async function handleCreatePlayer(e) {
    e.preventDefault()
    if (!token) return alert('Log in first')
    if (!newPlayer.name || !newPlayer.team) return alert('Name and team are required')
    setCreating(true)
    try {
      const res = await fetch(`${API}/players`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(newPlayer) })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.detail || 'Failed to create player')
      setNewPlayer({ name: '', team: '', nationality: '', position: '', cwc_status: '', image_url: '' })
      await fetchPlayers(q)
      alert('Player created')
    } catch (err) {
      alert(err.message)
    } finally {
      setCreating(false)
    }
  }

  async function handleAddTick(e) {
    e.preventDefault()
    if (!token) return alert('Log in first')
    const pid = selected?.id
    if (!pid) return alert('Select a player first')
    const price = parseFloat(tickPrice)
    if (!price || price <= 0) return alert('Enter a valid price')
    const res = await fetch(`${API}/players/${pid}/tick`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify({ price, event: tickEvent || undefined }) })
    const data = await res.json()
    if (!res.ok) return alert(data?.detail || 'Failed to add tick')
    setTickPrice('')
    setTickEvent('')
    // WS will push the new price immediately
    alert('Price tick added')
  }

  async function quickDeposit(e) {
    e.preventDefault()
    if (!token) return alert('Log in first')
    const amt = parseFloat(depositAmt)
    if (!amt || amt <= 0) return alert('Enter a valid amount')
    const res = await fetch(`${API}/wallet/deposit`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify({ amount: amt, provider: 'demo' }) })
    const data = await res.json()
    if (!res.ok) return alert(data?.detail || 'Deposit failed')
    await fetchPortfolio()
    alert(`Deposited $${amt.toFixed(2)}`)
  }

  function Market() {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <input value={q} onChange={(e)=>{ setQ(e.target.value); }} onKeyDown={(e)=>{ if (e.key==='Enter') fetchPlayers(q) }} placeholder="Search players" className="flex-1 bg-slate-900/60 border border-slate-700 rounded p-2 text-white" />
          <button onClick={()=>fetchPlayers(q)} className="bg-slate-700 hover:bg-slate-600 text-white rounded px-3 py-2">Search</button>
        </div>
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

  function Admin() {
    if (!token) return <p className="text-blue-200">Log in to use admin tools.</p>
    return (
      <div className="space-y-6">
        <div className="bg-slate-800/50 border border-blue-500/20 rounded-2xl p-4">
          <h4 className="text-white font-semibold mb-3">Create Player</h4>
          <form onSubmit={handleCreatePlayer} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input className="bg-slate-900/60 border border-slate-700 rounded p-2 text-white" placeholder="Name" value={newPlayer.name} onChange={(e)=>setNewPlayer(v=>({ ...v, name: e.target.value }))} />
            <input className="bg-slate-900/60 border border-slate-700 rounded p-2 text-white" placeholder="Team" value={newPlayer.team} onChange={(e)=>setNewPlayer(v=>({ ...v, team: e.target.value }))} />
            <input className="bg-slate-900/60 border border-slate-700 rounded p-2 text-white" placeholder="Nationality" value={newPlayer.nationality} onChange={(e)=>setNewPlayer(v=>({ ...v, nationality: e.target.value }))} />
            <input className="bg-slate-900/60 border border-slate-700 rounded p-2 text-white" placeholder="Position" value={newPlayer.position} onChange={(e)=>setNewPlayer(v=>({ ...v, position: e.target.value }))} />
            <input className="bg-slate-900/60 border border-slate-700 rounded p-2 text-white" placeholder="Status (current/upcoming/etc)" value={newPlayer.cwc_status} onChange={(e)=>setNewPlayer(v=>({ ...v, cwc_status: e.target.value }))} />
            <input className="bg-slate-900/60 border border-slate-700 rounded p-2 text-white" placeholder="Image URL" value={newPlayer.image_url} onChange={(e)=>setNewPlayer(v=>({ ...v, image_url: e.target.value }))} />
            <div className="md:col-span-3 flex justify-end">
              <button disabled={creating} className="bg-green-600 hover:bg-green-500 text-white rounded px-4 py-2 disabled:opacity-60">{creating ? 'Creating...' : 'Create'}</button>
            </div>
          </form>
        </div>

        <div className="bg-slate-800/50 border border-blue-500/20 rounded-2xl p-4">
          <h4 className="text-white font-semibold mb-3">Add Price Tick</h4>
          <form onSubmit={handleAddTick} className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input disabled className="bg-slate-900/60 border border-slate-700 rounded p-2 text-white md:col-span-2" value={selected?.name ? `${selected.name} (${selected.team})` : 'Select a player from Market list'} />
            <input className="bg-slate-900/60 border border-slate-700 rounded p-2 text-white" placeholder="Price" value={tickPrice} onChange={(e)=>setTickPrice(e.target.value)} />
            <input className="bg-slate-900/60 border border-slate-700 rounded p-2 text-white" placeholder="Event (optional)" value={tickEvent} onChange={(e)=>setTickEvent(e.target.value)} />
            <div className="md:col-span-4 flex justify-end">
              <button className="bg-blue-600 hover:bg-blue-500 text-white rounded px-4 py-2">Add Tick</button>
            </div>
          </form>
        </div>

        <div className="bg-slate-800/50 border border-blue-500/20 rounded-2xl p-4">
          <h4 className="text-white font-semibold mb-3">Quick Deposit</h4>
          <form onSubmit={quickDeposit} className="flex items-center gap-3">
            <input className="bg-slate-900/60 border border-slate-700 rounded p-2 text-white" placeholder="Amount" value={depositAmt} onChange={(e)=>setDepositAmt(e.target.value)} />
            <button className="bg-purple-600 hover:bg-purple-500 text-white rounded px-4 py-2">Deposit</button>
          </form>
          <p className="text-blue-300 text-xs mt-2">Simulates funding your wallet for demo purposes.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div className="flex gap-2">
          {['market','portfolio','chat', ...(token ? ['admin'] : [])].map(t => (
            <button key={t} onClick={()=>setTab(t)} className={`px-3 py-1 rounded ${tab===t ? 'bg-blue-600 text-white' : 'bg-slate-800/60 text-blue-200'}`}>{t[0].toUpperCase()+t.slice(1)}</button>
          ))}
        </div>
        <div>
          {tab === 'market' && <Market />}
          {tab === 'portfolio' && <PortfolioView />}
          {tab === 'chat' && <Chat />}
          {tab === 'admin' && <Admin />}
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
