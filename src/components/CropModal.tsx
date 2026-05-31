import React, { useEffect, useRef, useState } from 'react'
import { CropState } from '../types'

interface Props {
  originalImage: HTMLImageElement
  onConfirm: (cropped: HTMLImageElement) => void
  onCancel: () => void
  avatarSize?: number
}

const SIZE = 300

export const CropModal: React.FC<Props> = ({
  originalImage, onConfirm, onCancel, avatarSize = 40,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [state, setState] = useState<CropState>({
    image: originalImage, offsetX: 0, offsetY: 0, zoom: 1,
  })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx || !state.image) return

    canvas.width = SIZE
    canvas.height = SIZE

    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, SIZE, SIZE)

    ctx.save()
    ctx.beginPath()
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2)
    ctx.clip()
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    const sw = state.image.width * state.zoom
    const sh = state.image.height * state.zoom
    ctx.drawImage(state.image, SIZE / 2 - sw / 2 + state.offsetX, SIZE / 2 - sh / 2 + state.offsetY, sw, sh)
    ctx.restore()

    ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2)
    ctx.stroke()
  }, [state])

  const handleConfirm = () => {
    const c = document.createElement('canvas')
    c.width = avatarSize
    c.height = avatarSize
    const cx = c.getContext('2d')
    if (!cx) return
    cx.imageSmoothingEnabled = true
    cx.imageSmoothingQuality = 'high'
    const sw = state.image!.width * state.zoom
    const sh = state.image!.height * state.zoom
    const ox = (state.offsetX / SIZE) * avatarSize * 0.5
    const oy = (state.offsetY / SIZE) * avatarSize * 0.5
    cx.save()
    cx.beginPath()
    cx.arc(avatarSize / 2, avatarSize / 2, avatarSize / 2, 0, Math.PI * 2)
    cx.clip()
    cx.drawImage(
      state.image!,
      avatarSize / 2 - (sw / SIZE) * avatarSize * 0.5 + ox,
      avatarSize / 2 - (sh / SIZE) * avatarSize * 0.5 + oy,
      (sw / SIZE) * avatarSize, (sh / SIZE) * avatarSize,
    )
    cx.restore()
    const img = new Image()
    img.onload = () => onConfirm(img)
    img.src = c.toDataURL()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
    >
      <div className="bg-[#1a1a2e]/90 backdrop-blur-xl rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-white/10">
        <h2 className="text-lg font-bold text-white text-center mb-1">Crop Your Photo</h2>
        <p className="text-white/40 text-xs text-center mb-4">Position your face in the circle</p>

        <div className="flex justify-center mb-4">
          <canvas
            ref={canvasRef}
            className="w-full max-w-[240px] aspect-square border-2 border-white/10 rounded-full"
          />
        </div>

        <div className="space-y-3 mb-4">
          {([['Left / Right', 'offsetX'], ['Up / Down', 'offsetY']] as const).map(([label, key]) => (
            <div key={key}>
              <label className="text-xs text-white/40 block mb-1">{label}</label>
              <input
                type="range" min={-100} max={100}
                value={state[key]}
                onChange={e => setState(s => ({ ...s, [key]: +e.target.value }))}
                className="w-full accent-cyan-400"
              />
            </div>
          ))}
          <div>
            <label className="text-xs text-white/40 block mb-1">Zoom</label>
            <div className="flex gap-2 items-center">
              <button
                onClick={() => setState(s => ({ ...s, zoom: Math.max(0.5, s.zoom - 0.2) }))}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition"
              >−</button>
              <span className="flex-1 text-center text-sm font-medium text-white/70">
                {state.zoom.toFixed(1)}x
              </span>
              <button
                onClick={() => setState(s => ({ ...s, zoom: Math.min(3, s.zoom + 0.2) }))}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition"
              >+</button>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleConfirm}
            className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold py-2.5 rounded-xl text-sm transition-all duration-200 shadow-lg shadow-cyan-500/20"
          >
            Use Photo
          </button>
          <button
            onClick={onCancel}
            className="flex-1 bg-white/10 hover:bg-white/20 text-white/70 font-bold py-2.5 rounded-xl text-sm transition-all duration-200"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
