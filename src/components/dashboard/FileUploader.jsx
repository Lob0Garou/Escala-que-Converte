
import React from 'react';
import { Upload } from 'lucide-react';

export const FileUploader = ({ label, onUpload, required, accept, data, errorState }) => {
    const [dragActive, setDragActive] = React.useState(false);

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const event = { target: { files: e.dataTransfer.files } };
            onUpload(event);
        }
    };

    return (
        <div
            className={`
                relative group overflow-hidden
                bg-[var(--bg-card)] backdrop-blur-3xl border rounded-[var(--radius-premium)] 
                shadow-[var(--shadow-premium)] p-8 transition-all duration-500 
                flex flex-col items-center justify-center h-[240px] w-full
                ${dragActive
                    ? 'border-[var(--c-red)] bg-[var(--c-red-muted)] scale-[1.02]'
                    : 'border-[var(--glass-border)] hover:border-white/20'
                }
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
        >
            {/* Animated background glow */}
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-700 bg-gradient-to-br from-[var(--c-red)] to-transparent pointer-events-none`} />

            <label className="relative z-10 block cursor-pointer text-center w-full">
                <div className={`
                    w-16 h-16 rounded-2xl bg-white/5 mx-auto mb-6 flex items-center justify-center 
                    group-hover:scale-110 group-hover:bg-white/10 transition-all duration-500
                    ${dragActive ? 'bg-[var(--c-red)]/20' : ''}
                `}>
                    <Upload className={`w-8 h-8 transition-colors duration-500 ${dragActive ? 'text-[var(--c-red)]' : 'text-[var(--text-muted)]'}`} />
                </div>

                <h3 className="text-base font-black text-[var(--text-vibrant)] tracking-[0.1em] mb-2 uppercase">
                    {label}
                </h3>

                {required && (
                    <span className="text-[10px] text-[var(--c-red)] font-black uppercase tracking-[0.2em] mb-4 block">
                        Obrigatório
                    </span>
                )}

                {data && !errorState ? (
                    <div className="mt-4 bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest inline-flex items-center gap-2 border border-emerald-500/20 animate-in zoom-in-95 duration-300">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Arquivo Pronto
                    </div>
                ) : errorState ? (
                    <div className="mt-4 bg-rose-500/10 text-rose-400 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest border border-rose-500/20">
                        {errorState}
                    </div>
                ) : (
                    <p className="text-[var(--text-muted)] text-sm mt-3 font-medium">
                        Arraste ou clique <span className="text-[var(--text-secondary)] font-bold">{accept}</span>
                    </p>
                )}

                <input type="file" accept={accept} onChange={onUpload} className="hidden" />
            </label>
        </div>
    );
};
