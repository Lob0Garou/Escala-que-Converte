import React, { useEffect, useState } from 'react';
import { ChevronLeft, X } from 'lucide-react';

export const TimePickerModal = ({ isOpen, onClose, onSelect, initialValue }) => {
  const [step, setStep] = useState('hour');
  const [selectedHour, setSelectedHour] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setStep('hour');
      if (initialValue) {
        const [hour] = initialValue.split(':');
        setSelectedHour(hour);
      }
    }
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

  const hours = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0'));
  const minutes = ['00', '15', '30', '45'];

  const handleHourClick = (hour) => {
    setSelectedHour(hour);
    setStep('minute');
  };

  const handleMinuteClick = (minute) => {
    onSelect(`${selectedHour}:${minute}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-bg-surface border border-border rounded-2xl shadow-2xl w-[320px] overflow-hidden transform transition-all scale-100">
        <div className="bg-bg-elevated p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            {step === 'minute' && (
              <button onClick={() => setStep('hour')} className="text-text-muted hover:text-text-primary transition-colors" aria-label="Voltar para seleção de hora">
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <h3 className="text-xs font-bold text-text-primary uppercase tracking-widest">
              {step === 'hour' ? 'Escolha a Hora' : `Hora: ${selectedHour}h`}
            </h3>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors" aria-label="Fechar modal">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          {step === 'hour' && (
            <div className="grid grid-cols-6 gap-2">
              {hours.map((hour) => (
                <button
                  key={hour}
                  onClick={() => handleHourClick(hour)}
                  className={`
                    h-10 rounded-lg text-sm font-bold tabular-nums transition-all border
                    ${selectedHour === hour
                      ? 'bg-accent-main text-white border-accent-main shadow-sm'
                      : 'bg-bg-elevated border-border text-text-secondary hover:bg-bg-overlay hover:border-border hover:text-text-primary'
                    }
                  `}
                >
                  {hour}
                </button>
              ))}
            </div>
          )}

          {step === 'minute' && (
            <div className="flex flex-col gap-4">
              <p className="text-xs text-center text-text-muted uppercase tracking-widest">Selecione os minutos</p>
              <div className="grid grid-cols-2 gap-3">
                {minutes.map((minute) => (
                  <button
                    key={minute}
                    onClick={() => handleMinuteClick(minute)}
                    className="h-14 rounded-xl bg-bg-elevated border border-border text-xl font-bold text-text-primary hover:bg-accent-light hover:border-accent-border hover:text-accent-main transition-all tabular-nums"
                  >
                    :{minute}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TimePickerModal;
