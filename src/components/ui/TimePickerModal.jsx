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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#1a1e27] border border-white/10 rounded-2xl shadow-2xl w-[320px] overflow-hidden transform transition-all scale-100">
        <div className="bg-[#11141a] p-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {step === 'minute' && (
              <button onClick={() => setStep('hour')} className="text-slate-400 hover:text-white transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest">
              {step === 'hour' ? 'Escolha a Hora' : `Hora: ${selectedHour}h`}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors" aria-label="Fechar modal">
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
                      ? 'bg-[#E30613] text-black border-[#E30613] shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                      : 'bg-[#11141a] border-white/5 text-slate-300 hover:bg-white/5 hover:border-white/10'
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
              <p className="text-xs text-center text-slate-500 uppercase tracking-widest">Selecione os minutos</p>
              <div className="grid grid-cols-2 gap-3">
                {minutes.map((minute) => (
                  <button
                    key={minute}
                    onClick={() => handleMinuteClick(minute)}
                    className="h-14 rounded-xl bg-[#11141a] border border-white/5 text-xl font-bold text-white hover:bg-[#E30613]/20 hover:border-[#E30613] hover:text-[#E30613] transition-all tabular-nums"
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
