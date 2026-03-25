import React from 'react';
import UploadBox from './UploadBox';
import UnifiedEscalaUploader from './UnifiedEscalaUploader';

export const UploadSection = ({
  handleFileUpload,
  handleDrag,
  handleDrop,
  dragActive,
  setDragActive,
  cuponsData,
  salesData,
  error,
  onEscalaProcessed,
  processFile,
  selectedDay,
}) => (
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

    <UnifiedEscalaUploader
      processFile={processFile}
      onEscalaProcessed={onEscalaProcessed}
      selectedDay={selectedDay}
      dragActive={dragActive.escala}
      setDragActive={setDragActive}
      error={error.escala}
    />

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

    {/* 4ª coluna vazia — reservada para futura expansão */}
    <div />
  </section>
);

export default UploadSection;
