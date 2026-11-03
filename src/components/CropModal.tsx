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
    <div className="crop-overlay">
      <div className="crop-dialog">
        <p className="crop-overline">PHOTO BOOTH</p>
        <h2 className="crop-title">Crop your photo</h2>
        <p className="crop-description">Center yourself in the frame, then get back in the air.</p>

        <div className="crop-preview">
          <canvas
            ref={canvasRef}
            className="crop-canvas"
          />
        </div>

        <div className="crop-controls">
          {([['Left / Right', 'offsetX'], ['Up / Down', 'offsetY']] as const).map(([label, key]) => (
            <div className="crop-slider" key={key}>
              <label>{label}</label>
              <input
                type="range" min={-100} max={100}
                value={state[key]}
                onChange={e => setState(s => ({ ...s, [key]: +e.target.value }))}
              />
            </div>
          ))}
          <div className="crop-slider">
            <label>Zoom</label>
            <div className="zoom-control">
              <button
                onClick={() => setState(s => ({ ...s, zoom: Math.max(0.5, s.zoom - 0.2) }))}
              >−</button>
              <span>
                {state.zoom.toFixed(1)}x
              </span>
              <button
                onClick={() => setState(s => ({ ...s, zoom: Math.min(3, s.zoom + 0.2) }))}
              >+</button>
            </div>
          </div>
        </div>

        <div className="crop-actions">
          <button
            onClick={handleConfirm}
            className="crop-confirm"
          >
            USE THIS PHOTO ↗
          </button>
          <button
            onClick={onCancel}
            className="crop-cancel"
          >
            CANCEL
          </button>
        </div>
      </div>
    </div>
  )
}
