/**
 * CropModal Component
 *
 * Allows users to crop their avatar into a perfect circle
 * Includes interactive sliders for position and zoom
 * Uses canvas-based preview with high-quality rendering
 */

import React, { useEffect, useRef, useState } from 'react';
import { CropState } from '../types';

interface CropModalProps {
  originalImage: HTMLImageElement;
  onConfirm: (croppedImage: HTMLImageElement) => void;
  onCancel: () => void;
  avatarSize?: number;
}

const CROP_PREVIEW_SIZE = 300;
const DEFAULT_AVATAR_SIZE = 40;

export const CropModal: React.FC<CropModalProps> = ({
  originalImage,
  onConfirm,
  onCancel,
  avatarSize = DEFAULT_AVATAR_SIZE,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cropState, setCropState] = useState<CropState>({
    image: originalImage,
    offsetX: 0,
    offsetY: 0,
    zoom: 1,
  });

  /**
   * Draw crop preview with circular clipping
   */
  const drawCropPreview = (state: CropState) => {
    const canvas = canvasRef.current;
    if (!canvas || !state.image) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = CROP_PREVIEW_SIZE;
    canvas.height = CROP_PREVIEW_SIZE;

    // Black background
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, CROP_PREVIEW_SIZE, CROP_PREVIEW_SIZE);

    ctx.save();

    // Create circular clipping region
    ctx.beginPath();
    ctx.arc(
      CROP_PREVIEW_SIZE / 2,
      CROP_PREVIEW_SIZE / 2,
      CROP_PREVIEW_SIZE / 2,
      0,
      Math.PI * 2
    );
    ctx.clip();

    // Calculate scaled image dimensions
    const scaledWidth = state.image.width * state.zoom;
    const scaledHeight = state.image.height * state.zoom;
    const x = CROP_PREVIEW_SIZE / 2 - scaledWidth / 2 + state.offsetX;
    const y = CROP_PREVIEW_SIZE / 2 - scaledHeight / 2 + state.offsetY;

    // Draw image with high quality
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(state.image, x, y, scaledWidth, scaledHeight);

    ctx.restore();

    // Draw circle border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(
      CROP_PREVIEW_SIZE / 2,
      CROP_PREVIEW_SIZE / 2,
      CROP_PREVIEW_SIZE / 2,
      0,
      Math.PI * 2
    );
    ctx.stroke();
  };

  /**
   * Redraw preview when crop state changes
   */
  useEffect(() => {
    drawCropPreview(cropState);
  }, [cropState]);

  /**
   * Create final circular avatar image
   */
  const handleConfirm = () => {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = avatarSize;
    tempCanvas.height = avatarSize;
    const tempCtx = tempCanvas.getContext('2d');

    if (!tempCtx) return;

    tempCtx.imageSmoothingEnabled = true;
    tempCtx.imageSmoothingQuality = 'high';

    // Calculate scaled dimensions for final avatar
    const scaledWidth = cropState.image!.width * cropState.zoom;
    const scaledHeight = cropState.image!.height * cropState.zoom;
    const offsetX = (cropState.offsetX / CROP_PREVIEW_SIZE) * avatarSize * 0.5;
    const offsetY = (cropState.offsetY / CROP_PREVIEW_SIZE) * avatarSize * 0.5;

    tempCtx.save();

    // Create circular clipping
    tempCtx.beginPath();
    tempCtx.arc(
      avatarSize / 2,
      avatarSize / 2,
      avatarSize / 2,
      0,
      Math.PI * 2
    );
    tempCtx.clip();

    // Draw image into circular avatar
    tempCtx.drawImage(
      cropState.image!,
      avatarSize / 2 - (scaledWidth / CROP_PREVIEW_SIZE) * avatarSize * 0.5 + offsetX,
      avatarSize / 2 - (scaledHeight / CROP_PREVIEW_SIZE) * avatarSize * 0.5 + offsetY,
      (scaledWidth / CROP_PREVIEW_SIZE) * avatarSize,
      (scaledHeight / CROP_PREVIEW_SIZE) * avatarSize
    );

    tempCtx.restore();

    // Convert to Image for game use
    const croppedImage = new Image();
    croppedImage.onload = () => {
      onConfirm(croppedImage);
    };
    croppedImage.src = tempCanvas.toDataURL();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl p-4 sm:p-8 max-w-md w-full shadow-2xl mx-2">
        <h2 className="text-white text-xl sm:text-2xl font-bold mb-4 text-center">
          Position Your Avatar
        </h2>

        <p className="text-white/80 text-sm text-center mb-4">
          Adjust position and zoom to fit the circle perfectly
        </p>

        {/* Crop Preview */}
        <div className="flex justify-center mb-6">
          <canvas
            ref={canvasRef}
            className="border-4 border-white rounded-full shadow-lg w-full max-w-[300px] aspect-square"
          />
        </div>

        {/* Sliders */}
        <div className="space-y-3 sm:space-y-4 bg-black/20 p-3 sm:p-4 rounded-lg mb-4 sm:mb-6">
          <div>
            <label className="text-white/80 text-xs block mb-1 sm:mb-2">
              Move Left/Right
            </label>
            <input
              type="range"
              min="-100"
              max="100"
              value={cropState.offsetX}
              onChange={(e) =>
                setCropState({ ...cropState, offsetX: parseInt(e.target.value) })
              }
              className="w-full"
            />
          </div>

          <div>
            <label className="text-white/80 text-xs block mb-1 sm:mb-2">
              Move Up/Down
            </label>
            <input
              type="range"
              min="-100"
              max="100"
              value={cropState.offsetY}
              onChange={(e) =>
                setCropState({ ...cropState, offsetY: parseInt(e.target.value) })
              }
              className="w-full"
            />
          </div>

          <div>
            <label className="text-white/80 text-xs block mb-1 sm:mb-2">Zoom</label>
            <div className="flex gap-2">
              <button
                onClick={() =>
                  setCropState({
                    ...cropState,
                    zoom: Math.max(0.5, cropState.zoom - 0.2),
                  })
                }
                className="flex-1 bg-purple-500 hover:bg-purple-600 text-white py-1 rounded transition"
              >
                −
              </button>
              <span className="flex-1 text-center text-white text-sm">
                {cropState.zoom.toFixed(1)}x
              </span>
              <button
                onClick={() =>
                  setCropState({
                    ...cropState,
                    zoom: Math.min(3, cropState.zoom + 0.2),
                  })
                }
                className="flex-1 bg-purple-500 hover:bg-purple-600 text-white py-1 rounded transition"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-2 sm:gap-3">
          <button
            onClick={handleConfirm}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2 sm:py-2 rounded-lg transition text-sm sm:text-base"
          >
            ✓ Use This
          </button>
          <button
            onClick={onCancel}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2 sm:py-2 rounded-lg transition text-sm sm:text-base"
          >
            ✕ Change
          </button>
        </div>
      </div>
    </div>
  );
};
