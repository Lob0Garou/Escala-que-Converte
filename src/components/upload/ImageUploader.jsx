import React, { useRef, useState } from 'react';
import { Camera, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

/**
 * ImageUploader - Componente para captura de imagem de escala
 * Usa Claude Vision API para processar imagem e extrair dados da escala
 */
const ImageUploader = ({ onImageProcessed }) => {
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [preview, setPreview] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('anthropic_api_key') || '');
  const fileInputRef = useRef(null);

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Preview local
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setStatus('loading');
    setErrorMessage('');

    try {
      // Dynamic import do visionParser
      const { processScheduleImage } = await import('../../lib/visionParser');

      // Usa API key do localStorage ou a digitada
      const key = localStorage.getItem('anthropic_api_key') || apiKey;
      if (!key) {
        throw new Error('API Key da Anthropic não encontrada. Digite no campo abaixo.');
      }

      const result = await processScheduleImage(file, key);

      // Callback com dados processados
      if (onImageProcessed) {
        onImageProcessed(result.funcionarios || []);
      }

      setStatus('success');
    } catch (err) {
      console.error('Erro ao processar imagem:', err);
      setErrorMessage(err.message || 'Erro ao processar imagem');
      setStatus('error');
    }
  };

  const handleApiKeySave = (value) => {
    setApiKey(value);
    localStorage.setItem('anthropic_api_key', value);
  };

  return (
    <div className="flex flex-col h-[300px] bg-[#121620]/60 backdrop-blur-2xl border border-white/5 rounded-2xl shadow-xl overflow-hidden hover:border-white/10 transition-all duration-300 group">
      <div className="flex items-center justify-between px-6 pt-6 mb-2">
        <h3 className="text-sm font-bold text-white tracking-widest uppercase">Escala via Imagem</h3>
        <span className="text-[10px] font-bold text-[#E30613] bg-[#E30613]/10 border border-[#E30613]/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
          Beta
        </span>
      </div>

      <div className="flex-1 px-6 pb-6 flex flex-col">
        {/* Preview da imagem */}
        {preview && (
          <div className="relative mb-3 flex-shrink-0">
            <img
              src={preview}
              alt="Preview"
              className="w-full h-24 object-cover rounded-lg"
            />
            {status === 'loading' && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              </div>
            )}
            {status === 'success' && (
              <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
            )}
            {status === 'error' && (
              <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center rounded-lg">
                <AlertCircle className="w-6 h-6 text-red-400" />
              </div>
            )}
          </div>
        )}

        {/* Campo API Key */}
        <input
          type="password"
          value={apiKey}
          onChange={(e) => handleApiKeySave(e.target.value)}
          placeholder="API Key Anthropic (opcional)"
          className="w-full px-3 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-gray-300 placeholder-gray-500 mb-2 focus:outline-none focus:border-[#E30613]/50"
        />

        {/* Área de upload */}
        <div
          className="flex-1 cursor-pointer flex flex-col items-center justify-center border border-dashed border-white/10 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-300"
          onClick={() => fileInputRef.current?.click()}
        >
          <Camera className="w-6 h-6 text-gray-500 group-hover:text-[#E30613] mb-2 transition-colors" />
          <p className="text-xs text-gray-400 font-medium text-center">
            {status === 'loading' ? 'Processando...' : 'Foto da Escala'}
          </p>
          <p className="text-[10px] text-gray-500 mt-1">
            Clique ou arraste uma imagem
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Mensagem de erro */}
        {status === 'error' && errorMessage && (
          <p className="text-[10px] text-red-400 mt-2 text-center">{errorMessage}</p>
        )}
      </div>
    </div>
  );
};

export default ImageUploader;
