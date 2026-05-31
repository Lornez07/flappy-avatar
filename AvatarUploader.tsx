/**
 * AvatarUploader Component
 *
 * Handles file input and preview for avatar image
 * Transitions to CropModal when image selected
 */

import React, { useRef } from 'react';

interface AvatarUploaderProps {
  onImageSelected: (image: HTMLImageElement) => void;
  previewSrc?: string;
}

export const AvatarUploader: React.FC<AvatarUploaderProps> = ({
  onImageSelected,
  previewSrc,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        onImageSelected(img);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex gap-3 items-center justify-center flex-wrap mb-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-5 py-2 rounded-full font-bold text-sm hover:shadow-lg transition-shadow border-2 border-white whitespace-nowrap"
      >
        📤 Upload Image
      </button>
      {previewSrc && (
        <img
          src={previewSrc}
          alt="Avatar preview"
          className="w-[70px] h-[70px] rounded-full border-4 border-white shadow-lg object-cover"
        />
      )}
    </div>
  );
};
