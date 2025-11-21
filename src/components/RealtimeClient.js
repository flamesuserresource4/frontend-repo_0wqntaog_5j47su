// Lightweight WebSocket helpers for live ticks and chat
export function connectTicks(baseUrl, onTick) {
  const url = `${baseUrl.replace('http', 'ws')}/ws/ticks`
  const ws = new WebSocket(url)
  ws.onmessage = (ev) => {
    try {
      const msg = JSON.parse(ev.data)
      if (msg?.type === 'tick') onTick(msg)
    } catch (e) { /* ignore */ }
  }
  return ws
}

export function connectChat(baseUrl, onMessage) {
  const url = `${baseUrl.replace('http', 'ws')}/ws/chat`
  const ws = new WebSocket(url)
  ws.onmessage = (ev) => {
    try {
      const msg = JSON.parse(ev.data)
      if (msg?.type === 'chat') onMessage(msg)
    } catch (e) { /* ignore */ }
  }
  return ws
}
