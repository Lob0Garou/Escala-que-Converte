import React, { useRef, useState } from 'react';
import { AlertCircle, CheckCircle, CloudUpload, Loader2 } from 'lucide-react';

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
  const envKey = import.meta.env.VITE_GOOGLE_AI_API_KEY || '';
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('google_ai_api_key') || envKey);
  const [showApiKey, setShowApiKey] = useState(false);
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
      setErrorMessage('Formato nao suportado. Use .xlsx, .xls ou uma imagem.');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    try {
      if (type === 'excel') {
        await processFile(file, 'escala');
        setStatus('success');
      } else {
        const key = localStorage.getItem('google_ai_api_key') || apiKey || envKey;
        if (!key) {
          throw new Error('API Key do Google AI nao encontrada.');
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
    localStorage.setItem('google_ai_api_key', value);
  };

  const isLoading = status === 'loading';

  return (
    <div
      className={`group relative z-10 flex min-h-[280px] w-full flex-col items-center justify-center rounded-[30px] border p-6 shadow-[0_18px_48px_rgba(0,0,0,0.10)] transition-all duration-300 sm:min-h-[300px] sm:p-7 ${
        dragActive
          ? 'border-accent-main bg-accent-light/10 backdrop-blur-[28px] ring-4 ring-accent-light/20'
          : 'border-border/55 bg-bg-surface/44 backdrop-blur-[28px] hover:-translate-y-0.5 hover:border-accent-border'
      }`}
    >
      <div
        className="flex h-full w-full cursor-pointer flex-col items-center justify-center text-center"
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
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-border/70 bg-bg-elevated/80">
          {isLoading ? (
            <Loader2 className="h-7 w-7 animate-spin text-accent-main" strokeWidth={1.7} />
          ) : status === 'success' ? (
            <CheckCircle className="h-7 w-7 text-green-brand" strokeWidth={1.7} />
          ) : status === 'error' ? (
            <AlertCircle className="h-7 w-7 text-red-brand" strokeWidth={1.7} />
          ) : (
            <CloudUpload className={`h-7 w-7 transition-colors duration-300 ${dragActive ? 'text-accent-main' : 'text-text-muted'}`} strokeWidth={1.7} />
          )}
        </div>

        <h3 className="text-[1.85rem] font-semibold tracking-tight text-text-primary">Escala atual</h3>

        <div className="mt-5 flex flex-col items-center gap-3">
          {isLoading ? (
            <p className="max-w-[320px] text-[15px] leading-relaxed text-text-secondary">Processando arquivo...</p>
          ) : status === 'success' ? (
            <p className="max-w-[320px] text-[15px] font-semibold leading-relaxed text-green-brand">Escala carregada com sucesso.</p>
          ) : status === 'error' ? (
            <p className="max-w-[320px] text-[15px] font-semibold leading-relaxed text-red-brand">Falha ao processar.</p>
          ) : (
            <>
              <p className="max-w-[320px] text-[15px] leading-relaxed text-text-secondary">
                Arraste ou clique para carregar o planejamento de escala da equipe.
              </p>
              <p className="text-[13px] font-medium tracking-wide text-text-muted">( .xlsx, .xls ou imagem )</p>
            </>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,image/*"
        onChange={(e) => handleFile(e.target.files?.[0])}
        onClick={(e) => {
          e.target.value = '';
        }}
        className="hidden"
      />

      {!envKey && (
        <div className="absolute bottom-4 left-0 right-0 z-10 flex w-full flex-col items-center px-6 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowApiKey((v) => !v);
            }}
            className="w-full text-center text-[10px] text-text-muted transition-colors hover:text-text-secondary"
          >
            {showApiKey ? 'Ocultar chave API Google' : 'Configurar chave API Google (Visao)'}
          </button>
          {showApiKey && (
            <input
              type="password"
              value={apiKey}
              onChange={(e) => handleApiKeySave(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              placeholder="API Key Google AI Studio"
              className="mt-2 w-full rounded-lg border border-border bg-bg-surface px-3 py-1.5 text-xs text-text-primary shadow-sm placeholder:text-text-muted focus:border-accent-main focus:outline-none"
            />
          )}
        </div>
      )}

      {(status === 'error' || error) && (errorMessage || error) && (
        <div className="pointer-events-none absolute left-0 right-0 top-4">
          <p className="mx-auto max-w-[80%] truncate rounded-full border border-red-brand/30 bg-red-bg px-4 py-1.5 text-center text-[10px] text-red-brand shadow-sm">
            {errorMessage || error}
          </p>
        </div>
      )}
    </div>
  );
};

export default UnifiedEscalaUploader;
