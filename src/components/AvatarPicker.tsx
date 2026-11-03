import React from 'react'
import { AVATAR_SKINS, NEON_COLORS, AvatarConfig } from '../types'

interface Props {
  config: AvatarConfig
  onChange: (config: AvatarConfig) => void
  onUploadClick: () => void
}

export const AvatarPicker: React.FC<Props> = ({ config, onChange, onUploadClick }) => {
  return (
    <div className="avatar-picker">
      <div className="picker-section">
        <p className="picker-label">PICK YOUR PILOT</p>
        <div className="skin-grid">
          {AVATAR_SKINS.map(skin => (
            <button
              key={skin.id}
              type="button"
              onClick={() => onChange({ ...config, type: 'skin', skinId: skin.id, photoData: null })}
              aria-label={`${skin.label} avatar`}
              aria-pressed={config.type === 'skin' && config.skinId === skin.id}
              className={`skin-option ${config.type === 'skin' && config.skinId === skin.id ? 'is-selected' : ''}`}
              title={skin.label}
            >
              <span className="skin-emoji">{skin.emoji}</span>
              <span className="skin-name">{skin.label}</span>
              {config.type === 'skin' && config.skinId === skin.id && <span className="skin-check">✓</span>}
            </button>
          ))}
        </div>
      </div>

      <button type="button" onClick={onUploadClick} className="photo-upload">
        <span className="upload-icon" aria-hidden="true">＋</span>
        <span>{config.type === 'photo' ? 'CHANGE YOUR PHOTO' : 'USE YOUR OWN PHOTO'}</span>
        <span className="upload-arrow" aria-hidden="true">↗</span>
      </button>

      <div className="picker-section color-section">
        <div className="color-heading">
          <p className="picker-label">PICK A BADGE COLOR</p>
          <span>{NEON_COLORS.find(c => c.id === config.neonColorId)?.label ?? 'Sky'}</span>
        </div>
        <div className="color-grid">
          {NEON_COLORS.map(color => (
            <button
              key={color.id}
              type="button"
              onClick={() => onChange({ ...config, neonColorId: color.id })}
              aria-label={`${color.label} badge color`}
              aria-pressed={config.neonColorId === color.id}
              className={`color-option ${config.neonColorId === color.id ? 'is-selected' : ''}`}
              style={{ '--swatch': color.hex } as React.CSSProperties}
              title={color.label}
            >
              {config.neonColorId === color.id && <span aria-hidden="true">✓</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
