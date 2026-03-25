import React, { useRef, useState } from 'react';
import { Upload, Camera, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

/**
 * UnifiedEscalaUploader
 * Área de upload única para escala: aceita .xlsx/.xls e imagens.
 * - Excel  → processFile(file, 'escala')  [pipeline existente do hook]
 * - Imagem → processScheduleImage(file, apiKey) → onEscalaProcessed(linhas, selectedDay)
 */
const UnifiedEscalaUploader = ({
  processFile,
  onEscalaProcessed,
  selectedDay,
  dragActive,
  setDragActive,
  error,
}) => {
  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('openrouter_api_key') || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [fileType, setFileType] = useState(null); // 'excel' | 'image' | null
  const fileInputRef = useRef(null);

  const detectType = (file) => {
    if (!file) return null;
    const name = file.name.toLowerCase();
    if (name.endsWith('.xlsx') || name.endsWith('.xls')) return 'excel';
    if (file.type.startsWith('image/')) return 'image';
    return null;
  };

  const handleFile = async (file) => {
    if (!file) return;
    const type = detectType(file);
    if (!type) {
      setErrorMessage('Formato não suportado. Use .xlsx, .xls ou uma imagem.');
      setStatus('error');
      return;
    }

    setFileType(type);
    setStatus('loading');
    setErrorMessage('');

    try {
      if (type === 'excel') {
        // processFile já chama onEscalaProcessed internamente via o hook
        await processFile(file, 'escala');
        setStatus('success');
      } else {
        const key = localStorage.getItem('openrouter_api_key') || apiKey;
        if (!key) {
          throw new Error('API Key do OpenRouter não encontrada. Configure no campo abaixo.');
        }
        const { processScheduleImage } = await import('../../lib/visionParser');
        const result = await processScheduleImage(file, key);
        onEscalaProcessed(result.linhas, selectedDay);
        setStatus('success');
      }
    } catch (err) {
      console.error('Erro ao processar escala:', err);
      setErrorMessage(err.message || 'Erro ao processar arquivo');
      setStatus('error');
    }
  };

  const handleApiKeySave = (value) => {
    setApiKey(value);
    localStorage.setItem('openrouter_api_key', value);
  };

  const isLoading = status === 'loading';
  const icon = fileType === 'image'
    ? <Camera className="w-6 h-6 text-text-muted mb-3 transition-colors group-hover:text-accent-main" />
    : <Upload className="w-6 h-6 text-text-muted mb-3 transition-colors group-hover:text-accent-main" />;

  return (
    <div className="flex flex-col h-[300px] bg-bg-surface border border-border rounded-2xl shadow-sm overflow-hidden hover:border-accent-border transition-all duration-300 group">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-6 mb-2">
        <h3 className="text-sm font-bold text-text-primary tracking-widest uppercase">Escala</h3>
        <div className="flex items-center gap-2">
          {fileType === 'excel' && (
            <span className="text-[10px] font-bold text-accent-main bg-accent-main/10 border border-accent-main/20 px-2 py-0.5 rounded-full uppercase tracking-wider">XLSX</span>
          )}
          {fileType === 'image' && (
            <span className="text-[10px] font-bold text-blue-brand bg-blue-bg border border-blue-brand/20 px-2 py-0.5 rounded-full uppercase tracking-wider">IMG</span>
          )}
          {!fileType && (
            <span className="text-[10px] font-bold text-text-muted bg-bg-elevated border border-border px-2 py-0.5 rounded-full uppercase tracking-wider">Atual</span>
          )}
        </div>
      </div>

      <div className="flex-1 px-6 pb-6 flex flex-col gap-2">
        {/* Área de drop */}
        <div
          className={`flex-1 border border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${
            dragActive
              ? 'bg-accent-light/50 border-accent-main'
              : 'border-border bg-bg-elevated hover:bg-bg-overlay/50'
          }`}
          onDragEnter={() => setDragActive((prev) => ({ ...prev, escala: true }))}
          onDragLeave={() => setDragActive((prev) => ({ ...prev, escala: false }))}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive((prev) => ({ ...prev, escala: false }));
            handleFile(e.dataTransfer.files?.[0]);
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          {isLoading ? (
            <Loader2 className="w-6 h-6 text-text-primary animate-spin mb-2" />
          ) : status === 'success' ? (
            <CheckCircle className="w-6 h-6 text-green-brand mb-2" />
          ) : status === 'error' ? (
            <AlertCircle className="w-6 h-6 text-red-brand mb-2" />
          ) : (
            icon
          )}
          <p className="text-xs text-text-secondary font-medium">
            {isLoading ? 'Processando...' : 'Arraste ou clique'}
          </p>
          <p className="text-[10px] text-text-muted mt-1">.xlsx, .xls ou imagem</p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,image/*"
          onChange={(e) => handleFile(e.target.files?.[0])}
          onClick={(e) => { e.target.value = ''; }}
          className="hidden"
        />

        {/* API Key (colapsada por padrão, só relevante para imagens) */}
        <button
          type="button"
          onClick={() => setShowApiKey((v) => !v)}
          className="text-[10px] text-text-muted hover:text-text-primary text-left transition-colors"
        >
          {showApiKey ? '▲ Ocultar chave API' : '▼ Configurar chave API'}
        </button>
        {showApiKey && (
          <input
            type="password"
            value={apiKey}
            onChange={(e) => handleApiKeySave(e.target.value)}
            placeholder="API Key OpenRouter"
            className="w-full px-3 py-1.5 text-xs bg-bg-surface border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-main"
          />
        )}

        {/* Erro */}
        {(status === 'error' || error) && (errorMessage || error) && (
          <p className="text-[10px] text-red-brand text-center">
            {errorMessage || error}
          </p>
        )}
      </div>
    </div>
  );
};

export default UnifiedEscalaUploader;
