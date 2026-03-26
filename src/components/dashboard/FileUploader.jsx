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
                bg-bg-surface border-2 border-dashed rounded-xl 
                p-8 transition-colors duration-200 
                flex flex-col items-center justify-center h-[240px] w-full
                ${dragActive
                    ? 'border-accent-main bg-accent-light'
                    : 'border-border hover:border-text-muted hover:bg-bg-elevated'
                }
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
        >
            <label className="relative z-10 block cursor-pointer text-center w-full">
                <div className={`
                    w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center transition-colors duration-200
                    ${dragActive ? 'bg-accent-main/10 text-accent-main' : 'bg-bg-elevated text-text-muted group-hover:bg-bg-overlay'}
                `}>
                    <Upload className="w-5 h-5" />
                </div>

                <h3 className="text-sm font-semibold text-text-primary mb-1 uppercase tracking-wide">
                    {label}
                </h3>

                {required && (
                    <span className="text-[10px] text-red-700 font-bold uppercase tracking-[0.1em] mb-4 block">
                        Obrigatório
                    </span>
                )}

                {data && !errorState ? (
                    <div className="mt-4 bg-green-50 text-green-700 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide inline-flex items-center gap-1.5 border border-green-200">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        Arquivo Pronto
                    </div>
                ) : errorState ? (
                    <div className="mt-4 bg-red-50 text-red-700 px-3 py-1.5 rounded-md text-xs font-medium border border-red-200">
                        {errorState}
                    </div>
                ) : (
                    <p className="text-text-secondary text-xs mt-2 font-medium">
                        Arraste ou clique para enviar <span className="font-semibold">{accept}</span>
                    </p>
                )}

                <input type="file" accept={accept} onChange={onUpload} className="hidden" />
            </label>
        </div>
    );
};

export default FileUploader;
