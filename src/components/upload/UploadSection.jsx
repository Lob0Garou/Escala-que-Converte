import React from 'react';
import { Upload } from 'lucide-react';
import UploadBox from './UploadBox';
import ImageUploader from './ImageUploader';

export const UploadSection = ({ handleFileUpload, handleDrag, handleDrop, dragActive, setDragActive, cuponsData, salesData, error, onEscalaProcessed }) => (
  <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-6 h-full items-center max-w-7xl mx-auto w-full">
    <UploadBox
      type="cupons"
      title="Fluxo de Loja"
      onUpload={handleFileUpload}
      onDrag={handleDrag}
      onDrop={handleDrop}
      dragActiveState={dragActive.cupons}
      data={cuponsData}
      errorState={error.cupons}
    />

    <div className="flex flex-col h-[300px] bg-[#121620]/60 backdrop-blur-2xl border border-white/5 rounded-2xl shadow-xl overflow-hidden hover:border-white/10 transition-all duration-300 group">
      <div className="flex items-center justify-between px-6 pt-6 mb-2">
        <h3 className="text-sm font-bold text-white tracking-widest uppercase">Escala</h3>
        <span className="text-[10px] font-bold text-[#E30613] bg-[#E30613]/10 border border-[#E30613]/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
          Atual
        </span>
      </div>
      <div className="flex-1 px-6 pb-6">
        <div
          className={`h-full border border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${dragActive.escala ? 'bg-[#E30613]/5 border-[#E30613]' : 'bg-white/[0.02] hover:bg-white/[0.04]'}`}
          onDragEnter={() => setDragActive((prev) => ({ ...prev, escala: true }))}
          onDragLeave={() => setDragActive((prev) => ({ ...prev, escala: false }))}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setDragActive((prev) => ({ ...prev, escala: false }));
            if (event.dataTransfer.files?.[0]) handleFileUpload(event.dataTransfer.files[0], 'escala');
          }}
        >
          <label className="block cursor-pointer w-full h-full flex flex-col items-center justify-center">
            <Upload className="w-6 h-6 text-gray-500 group-hover:text-[#E30613] mb-3 transition-colors" />
            <p className="text-xs text-gray-400 font-medium">Arraste ou clique (.xlsx)</p>
            <input type="file" accept=".xlsx,.xls" onChange={(event) => event.target.files?.[0] && handleFileUpload(event.target.files[0], 'escala')} className="hidden" />
          </label>
        </div>
      </div>
    </div>

    <UploadBox
      type="vendas"
      title="Venda/Hora (Opcional)"
      onUpload={handleFileUpload}
      onDrag={handleDrag}
      onDrop={handleDrop}
      dragActiveState={dragActive.vendas}
      data={salesData || []}
      errorState={error.vendas}
    />

    <ImageUploader onImageProcessed={onEscalaProcessed} />
  </section>
);

export default UploadSection;
