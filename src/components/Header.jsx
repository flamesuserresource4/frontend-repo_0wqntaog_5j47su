import { useState } from 'react'

export default function Header({ onNavigate }) {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <header className="sticky top-0 z-20 backdrop-blur bg-slate-900/60 border-b border-blue-500/10">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/flame-icon.svg" alt="logo" className="w-8 h-8" />
          <span className="text-white font-semibold">PlayerStock</span>
        </div>
        <nav className="hidden md:flex items-center gap-6 text-sm text-blue-200">
          <button onClick={() => onNavigate('market')} className="hover:text-white">Market</button>
          <button onClick={() => onNavigate('portfolio')} className="hover:text-white">Portfolio</button>
          <button onClick={() => onNavigate('chat')} className="hover:text-white">Chat</button>
        </nav>
        <div className="md:hidden">
          <button onClick={() => setMenuOpen(v => !v)} className="text-blue-200">Menu</button>
        </div>
      </div>
      {menuOpen && (
        <div className="md:hidden px-4 pb-3 space-y-2 text-blue-200">
          <button onClick={() => onNavigate('market')} className="block w-full text-left">Market</button>
          <button onClick={() => onNavigate('portfolio')} className="block w-full text-left">Portfolio</button>
          <button onClick={() => onNavigate('chat')} className="block w-full text-left">Chat</button>
        </div>
      )}
    </header>
  )
}
