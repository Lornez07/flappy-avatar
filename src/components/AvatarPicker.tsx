import React from 'react'
import { AVATAR_SKINS, NEON_COLORS, AvatarConfig } from '../types'

interface Props {
  config: AvatarConfig
  onChange: (config: AvatarConfig) => void
  onUploadClick: () => void
}

export const AvatarPicker: React.FC<Props> = ({ config, onChange, onUploadClick }) => {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold tracking-widest text-white/50 uppercase mb-3">Avatar Skin</p>
        <div className="grid grid-cols-4 gap-2">
          {AVATAR_SKINS.map(skin => (
            <button
              key={skin.id}
              onClick={() => onChange({ ...config, type: 'skin', skinId: skin.id, photoData: null })}
              className={`
                relative aspect-square rounded-xl flex items-center justify-center text-2xl
                transition-all duration-200
                ${config.type === 'skin' && config.skinId === skin.id
                  ? 'ring-2 ring-white bg-white/20 shadow-lg shadow-white/10 scale-105'
                  : 'bg-white/5 hover:bg-white/10 hover:scale-105'
                }
              `}
            >
              <span>{skin.emoji}</span>
              {config.type === 'skin' && config.skinId === skin.id && (
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-400 shadow-lg shadow-green-400/50" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-xs text-white/30 font-medium">OR</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <button
        onClick={onUploadClick}
        className="w-full py-2.5 rounded-xl border border-dashed border-white/20 text-white/60 hover:text-white hover:border-white/40 text-sm font-medium transition-all duration-200"
      >
        + Upload Your Photo
      </button>

      <div>
        <p className="text-xs font-semibold tracking-widest text-white/50 uppercase mb-3">Neon Glow</p>
        <div className="flex gap-2 flex-wrap">
          {NEON_COLORS.map(color => (
            <button
              key={color.id}
              onClick={() => onChange({ ...config, neonColorId: color.id })}
              className={`
                w-8 h-8 rounded-full transition-all duration-200
                ${config.neonColorId === color.id
                  ? 'ring-2 ring-white scale-110 shadow-lg'
                  : 'hover:scale-110'
                }
              `}
              style={{ backgroundColor: color.hex }}
              title={color.label}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
