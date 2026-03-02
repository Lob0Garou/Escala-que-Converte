import React from 'react';
import { Upload } from 'lucide-react';

export const UploadBox = ({ type, title, onUpload, onDrag, onDrop, dragActiveState, data, errorState }) => (
  <div
    className={`bg-[#121620]/60 backdrop-blur-2xl border rounded-2xl shadow-xl p-6 transition-all duration-300 flex flex-col items-center justify-center h-[300px] ${dragActiveState ? 'border-[#E30613] bg-[#E30613]/5' : 'border-white/5 hover:border-white/10'}`}
    onDragEnter={(event) => onDrag(event, type)}
    onDragLeave={(event) => onDrag(event, type)}
    onDragOver={(event) => onDrag(event, type)}
    onDrop={(event) => onDrop(event, type)}
  >
    <label className="block cursor-pointer text-center w-full">
      <div className="w-12 h-12 rounded-xl bg-white/5 mx-auto mb-4 flex items-center justify-center">
        <Upload className={`w-6 h-6 ${dragActiveState ? 'text-[#E30613]' : 'text-gray-500'}`} />
      </div>
      <h3 className="text-lg font-bold text-white tracking-tight mb-1">{title}</h3>
      {data.length > 0 && !errorState ? (
        <div className="mt-2 bg-green-500/10 text-green-400 px-3 py-1 rounded-full text-xs font-bold inline-flex items-center tabular-nums">
          ? {data.length} Regs
        </div>
      ) : errorState ? (
        <div className="mt-2 bg-red-500/10 text-red-400 px-3 py-1 rounded-full text-xs font-bold">
          {errorState}
        </div>
      ) : (
        <p className="text-gray-500 text-xs">Arraste ou clique (.xlsx)</p>
      )}
      <input type="file" accept=".xlsx,.xls" onChange={(event) => event.target.files?.[0] && onUpload(event.target.files[0], type)} className="hidden" />
    </label>
  </div>
);

export default UploadBox;
