import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, RefreshCw, CheckCircle2, Sparkles, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

export const CameraModal = ({ albumId, albumTitle, onClose, onPhotoCaptured }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' for back camera, 'user' for front
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [flashEffect, setFlashEffect] = useState(false);

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      stopCamera();
    };
  }, [facingMode]);

  const startCamera = async (mode) => {
    stopCamera();
    setErrorMsg(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Error al acceder a la cámara:', err);
      setErrorMsg('No se pudo acceder a la cámara. Asegúrate de otorgar permisos en tu navegador.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current || isUploading) return;

    // Trigger visual flash feedback
    setFlashEffect(true);
    setTimeout(() => setFlashEffect(false), 200);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    
    // Mirror horizontally if using front camera
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    setIsUploading(true);
    try {
      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', 0.92)
      );

      if (blob) {
        const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
        await onPhotoCaptured(file);

        setUploadSuccess(true);
        try {
          confetti({ particleCount: 40, spread: 60, origin: { y: 0.8 } });
        } catch (e) {}

        setTimeout(() => {
          setUploadSuccess(false);
          setIsUploading(false);
        }, 1500);
      }
    } catch (err) {
      console.error('Error al capturar y subir foto:', err);
      setErrorMsg('Error al guardar la fotografía.');
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/90 backdrop-blur-lg">
      <div className="relative w-full max-w-xl h-[85vh] sm:h-[90vh] glass-panel rounded-3xl border border-slate-800 flex flex-col justify-between overflow-hidden shadow-2xl">
        
        {/* Flash overlay */}
        {flashEffect && (
          <div className="absolute inset-0 z-40 bg-white transition-opacity duration-200" />
        )}

        {/* Top Bar */}
        <div className="p-4 z-20 flex items-center justify-between bg-gradient-to-b from-slate-950/90 to-transparent">
          <div>
            <div className="flex items-center space-x-1.5 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <Camera className="w-4 h-4 animate-pulse" />
              <span>Cámara en Vivo</span>
            </div>
            <p className="text-white font-semibold text-sm truncate max-w-[240px]">
              Subiendo a: <span className="text-emerald-400">{albumTitle}</span>
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={toggleFacingMode}
              className="bg-slate-900/80 hover:bg-slate-800 text-slate-200 p-2.5 rounded-xl border border-slate-700/80 transition"
              title="Cambiar cámara Frontal / Trasera"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="bg-slate-900/80 hover:bg-slate-800 text-slate-300 p-2.5 rounded-xl border border-slate-700/80 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Camera Viewfinder */}
        <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
          {errorMsg ? (
            <div className="p-6 text-center text-slate-300 max-w-sm">
              <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
              <p className="text-sm font-medium">{errorMsg}</p>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Viewfinder crosshairs */}
              <div className="absolute inset-12 border border-white/20 rounded-2xl pointer-events-none flex items-center justify-center">
                <div className="w-8 h-8 border-t-2 border-l-2 border-emerald-400 absolute top-0 left-0 rounded-tl-xl" />
                <div className="w-8 h-8 border-t-2 border-r-2 border-emerald-400 absolute top-0 right-0 rounded-tr-xl" />
                <div className="w-8 h-8 border-b-2 border-l-2 border-emerald-400 absolute bottom-0 left-0 rounded-bl-xl" />
                <div className="w-8 h-8 border-b-2 border-r-2 border-emerald-400 absolute bottom-0 right-0 rounded-br-xl" />
              </div>
            </>
          )}

          {/* Success Notification Banner */}
          {uploadSuccess && (
            <div className="absolute inset-0 z-30 bg-emerald-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-pulse">
              <CheckCircle2 className="w-16 h-16 text-emerald-400 mb-2" />
              <h4 className="text-xl font-bold text-white">¡Fotografía Guardada!</h4>
              <p className="text-xs text-emerald-300 mt-1">Añadida automáticamente a tu álbum</p>
            </div>
          )}
        </div>

        {/* Bottom Shutter Controls */}
        <div className="p-6 z-20 bg-slate-950/90 backdrop-blur-md flex items-center justify-center border-t border-slate-800/80">
          <button
            onClick={capturePhoto}
            disabled={isUploading || !!errorMsg}
            className="group relative w-20 h-20 rounded-full border-4 border-emerald-400 p-1 flex items-center justify-center focus:outline-none transition active:scale-95 disabled:opacity-50"
          >
            <div className="w-full h-full rounded-full bg-emerald-500 group-hover:bg-emerald-400 transition-colors flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <Camera className="w-8 h-8 text-slate-950 stroke-[2.5]" />
            </div>
          </button>
        </div>

      </div>
    </div>
  );
};
