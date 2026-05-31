import React, { useRef } from 'react'

interface Props {
  onImageSelected: (image: HTMLImageElement) => void
}

export const AvatarUploader: React.FC<Props> = ({ onImageSelected }) => {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const img = new Image()
      img.onload = () => onImageSelected(img)
      img.src = ev.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  return (
    <div>
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleChange} className="hidden" />
      <button
        onClick={() => fileInputRef.current?.click()}
        className="w-full py-3 rounded-xl border-2 border-dashed border-white/30 text-white/50 hover:text-white hover:border-white/50 text-sm font-medium transition-all duration-200"
      >
        + Choose a Photo
      </button>
    </div>
  )
}
