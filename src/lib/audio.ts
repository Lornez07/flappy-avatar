let ctx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

export function playFlap() {
  const c = getCtx()
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = 'sine'
  o.frequency.setValueAtTime(350, c.currentTime)
  o.frequency.exponentialRampToValueAtTime(700, c.currentTime + 0.08)
  g.gain.setValueAtTime(0.15, c.currentTime)
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.1)
  o.connect(g).connect(c.destination)
  o.start(); o.stop(c.currentTime + 0.1)
}

export function playScore() {
  const c = getCtx()
  const notes = [523, 659]
  notes.forEach((freq, i) => {
    const o = c.createOscillator()
    const g = c.createGain()
    o.type = 'sine'
    const t = c.currentTime + i * 0.08
    o.frequency.setValueAtTime(freq, t)
    g.gain.setValueAtTime(0.12, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.15)
    o.connect(g).connect(c.destination)
    o.start(t); o.stop(t + 0.15)
  })
}

export function playHit() {
  const c = getCtx()
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = 'sawtooth'
  o.frequency.setValueAtTime(300, c.currentTime)
  o.frequency.exponentialRampToValueAtTime(80, c.currentTime + 0.25)
  g.gain.setValueAtTime(0.15, c.currentTime)
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.25)
  o.connect(g).connect(c.destination)
  o.start(); o.stop(c.currentTime + 0.25)
}
