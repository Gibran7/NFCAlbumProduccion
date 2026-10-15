import React, { useState, useRef } from 'react';
import { Upload, Camera, Image as ImageIcon, Sparkles, Loader2, CheckCircle2 } from 'lucide-react';

export const PhotoUploader = ({ albumTitle, photoCount, maxPhotos = 80, onUploadFiles, onOpenLiveCamera }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;
    const fileList = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (fileList.length === 0) return;
    if (photoCount + fileList.length > maxPhotos) {
      setUploadError(`El álbum permite hasta ${maxPhotos} fotos y quedan ${Math.max(0, maxPhotos - photoCount)} espacios.`);
      return;
    }

    setIsUploading(true);
    setUploadError('');
    setUploadProgress({ current: 0, total: fileList.length });

    try {
      for (let i = 0; i < fileList.length; i++) {
        await onUploadFiles(fileList[i]);
        setUploadProgress({ current: i + 1, total: fileList.length });
      }
    } catch (err) {
      console.error('Error durante la subida:', err);
      setUploadError(err.message || 'No se pudieron subir las fotos. Intenta de nuevo.');
    } finally {
      setIsUploading(false);
      setUploadProgress({ current: 0, total: 0 });
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  return (
    <div className="w-full bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 mb-8 shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        <div>
          <h3 className="text-lg font-extrabold text-slate-900 flex items-center space-x-2">
            <span>Añadir Fotos al Álbum</span>
            <span className="text-xs bg-rose-100 text-rose-600 px-2.5 py-0.5 rounded-full font-bold">
              {photoCount}/{maxPhotos}
            </span>
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Sube fotos desde tu galería o toma una nueva fotografía en el momento.
          </p>
        </div>

        {/* Quick Live Camera Button */}
        <button
          onClick={onOpenLiveCamera}
          disabled={photoCount >= maxPhotos}
          className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-extrabold text-xs flex items-center justify-center space-x-2 shadow-md shadow-rose-500/20 transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Camera className="w-4 h-4 stroke-[2.5]" />
          <span>Abrir Cámara en Vivo</span>
        </button>
      </div>

      {uploadError && (
        <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {uploadError}
        </p>
      )}

      {/* Drag & Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-all duration-300 ${
          isDragging
            ? 'border-rose-400 bg-rose-50/50 scale-[1.01]'
            : 'border-slate-200 bg-slate-50/60 hover:border-rose-300'
        }`}
      >
        {isUploading ? (
          <div className="py-6 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-10 h-10 text-rose-500 animate-spin" />
            <div className="text-sm font-bold text-slate-800">
              Subiendo fotografía {uploadProgress.current} de {uploadProgress.total}...
            </div>
            <div className="w-48 bg-slate-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-rose-500 h-full transition-all duration-300"
                style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-rose-500 shadow-sm">
              <Upload className="w-7 h-7" />
            </div>

            <div>
              <p className="text-sm font-extrabold text-slate-800">
                Arrastra y suelta tus fotos aquí
              </p>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Soporta JPG, PNG, WEBP (múltiples archivos a la vez)
              </p>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              {/* Native Gallery Pick */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={photoCount >= maxPhotos}
                className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold flex items-center space-x-2 transition shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ImageIcon className="w-4 h-4 text-rose-500" />
                <span>Seleccionar de la Galería</span>
              </button>

              {/* Native Mobile Camera Instant Input */}
              <button
                onClick={() => cameraInputRef.current?.click()}
                disabled={photoCount >= maxPhotos}
                className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold flex items-center space-x-2 transition shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Camera className="w-4 h-4 text-amber-500" />
                <span>Tomar Foto Directa</span>
              </button>
            </div>

            {/* Hidden file inputs */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              disabled={photoCount >= maxPhotos}
              accept="image/*"
              onChange={(e) => handleFiles(e.target.files)}
              className="hidden"
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              disabled={photoCount >= maxPhotos}
              onChange={(e) => handleFiles(e.target.files)}
              className="hidden"
            />
          </div>
        )}
      </div>
    </div>
  );
};
