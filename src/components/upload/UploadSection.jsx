import React from 'react';
import UploadBox from './UploadBox';
import UnifiedEscalaUploader from './UnifiedEscalaUploader';
import { FileText, LineChart, Users } from 'lucide-react';
import VortexBackdrop from '../layout/VortexBackdrop';

const STEPS = [
  {
    icon: FileText,
    badge: '01',
    title: 'Envie o fluxo da loja',
    copy: 'Importe a demanda por hora para abrir o contexto operacional.',
  },
  {
    icon: Users,
    badge: '02',
    title: 'Envie a escala atual',
    copy: 'Conecte o planejamento da equipe com a curva de fluxo real.',
  },
  {
    icon: LineChart,
    badge: '03',
    title: 'Receba o diagnostico',
    copy: 'Visualize cobertura, risco e impacto financeiro em uma leitura executiva.',
  },
];

export const UploadSection = ({
  handleFileUpload,
  handleDrag,
  handleDrop,
  dragActive,
  setDragActive,
  cuponsData,
  error,
  onEscalaProcessed,
  processFile,
  selectedDay,
}) => (
  <section className="relative isolate w-full px-4 py-6 sm:px-6 lg:px-8 xl:px-10">
    <VortexBackdrop
      className="-z-10"
      imageClassName="opacity-[0.28] brightness-[1.12] contrast-[1.16] saturate-[1.2] sm:opacity-[0.36] lg:opacity-[0.44]"
      overlayClassName="bg-bg-base/62 sm:bg-bg-base/54 lg:bg-bg-base/46"
      accentClassName="bg-[radial-gradient(circle_at_12%_10%,var(--accent-light),transparent_34%),radial-gradient(circle_at_88%_4%,var(--accent-light),transparent_30%),linear-gradient(180deg,rgba(17,17,19,0.06),transparent_20%)] opacity-40"
    />

    <div className="mx-auto w-full max-w-[1460px] animate-in fade-in duration-700">
      <div className="relative overflow-hidden rounded-[36px] border border-border/55 bg-bg-surface/60 p-5 shadow-[0_24px_90px_rgba(0,0,0,0.12)] backdrop-blur-[28px] sm:bg-bg-surface/56 sm:p-7 lg:bg-bg-surface/52 lg:p-10 xl:p-12">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-x-[12%] top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent opacity-70" />
          <div className="absolute left-1/2 top-[44%] h-32 w-32 -translate-x-1/2 rounded-full bg-accent-main/8 blur-[64px]" />
        </div>

        <div className="relative z-10">
          <div className="mx-auto max-w-[920px] text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-text-muted">Workspace executivo</p>
            <h1 className="mt-4 text-4xl font-semibold leading-[0.96] tracking-tight text-text-primary sm:text-5xl xl:text-6xl">
              A mesma equipe pode converter mais.
            </h1>
            <p className="mx-auto mt-5 max-w-[760px] text-base leading-relaxed text-text-secondary sm:text-lg">
              Alinhe fluxo de clientes e cobertura de equipe em um canvas mais equilibrado, legivel e pronto para decisao.
            </p>
          </div>

          <div className="mx-auto mt-8 grid max-w-[1120px] gap-5 lg:grid-cols-2 lg:gap-6">
            <UploadBox
              type="cupons"
              title="Fluxo da loja"
              description="Arraste ou clique para carregar o fluxo de demanda da loja."
              formats="( .xlsx )"
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
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3 md:gap-4">
        {STEPS.map((step) => {
          const StepIcon = step.icon;

          return (
            <div key={step.badge} className="rounded-[24px] border border-border/55 bg-bg-surface/46 p-4 shadow-sm backdrop-blur-[24px] md:bg-bg-surface/42 lg:bg-bg-surface/38 sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-bg-elevated/80 text-text-secondary">
                  <StepIcon className="h-5 w-5" strokeWidth={1.6} />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-text-muted">
                  {step.badge}
                </span>
              </div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-text-primary">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                {step.copy}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  </section>
);

export default UploadSection;
