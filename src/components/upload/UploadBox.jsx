import React from 'react';
import { CloudUpload } from 'lucide-react';

export const UploadBox = ({
  type,
  title,
  onUpload,
  onDrag,
  onDrop,
  dragActiveState,
  data,
  errorState,
  description,
  formats,
}) => (
  <div
    className={`relative z-10 flex min-h-[280px] w-full flex-col items-center justify-center rounded-[30px] border p-6 shadow-[0_18px_48px_rgba(0,0,0,0.10)] transition-all duration-300 sm:min-h-[300px] sm:p-7 ${
      dragActiveState
        ? 'border-accent-main bg-accent-light/10 backdrop-blur-[28px] ring-4 ring-accent-light/20'
        : 'border-border/55 bg-bg-surface/44 backdrop-blur-[28px] hover:-translate-y-0.5 hover:border-accent-border'
    }`}
    onDragEnter={(event) => onDrag(event, type)}
    onDragLeave={(event) => onDrag(event, type)}
    onDragOver={(event) => onDrag(event, type)}
    onDrop={(event) => onDrop(event, type)}
  >
    <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center text-center">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-border/70 bg-bg-elevated/80">
        <CloudUpload
          className={`h-7 w-7 transition-colors duration-300 ${dragActiveState ? 'text-accent-main' : 'text-text-muted'}`}
          strokeWidth={1.7}
        />
      </div>

      <h3 className="text-[1.85rem] font-semibold tracking-tight text-text-primary">{title}</h3>

      {data.length > 0 && !errorState ? (
        <div className="mt-6 inline-flex items-center rounded-full border border-green-brand/30 bg-green-bg px-4 py-2 text-sm font-semibold tabular-nums text-green-brand">
          {data.length} registros importados
        </div>
      ) : errorState ? (
        <div className="mt-6 rounded-full border border-red-brand/30 bg-red-bg px-4 py-2 text-sm font-semibold text-red-brand">
          {errorState}
        </div>
      ) : (
        <div className="mt-5 flex flex-col items-center gap-3">
          <p className="max-w-[320px] text-[15px] leading-relaxed text-text-secondary">
            {description || 'Arraste ou clique para carregar o arquivo.'}
          </p>
          <p className="text-[13px] font-medium tracking-wide text-text-muted">{formats || '( .xlsx )'}</p>
        </div>
      )}

      <input
        type="file"
        accept=".xlsx,.xls"
        onChange={(event) => event.target.files?.[0] && onUpload(event.target.files[0], type)}
        className="hidden"
      />
    </label>
  </div>
);

export default UploadBox;
