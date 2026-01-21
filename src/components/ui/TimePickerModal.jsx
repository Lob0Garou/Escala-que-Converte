import React, { useState, useEffect } from 'react';
import { ChevronLeft, X } from 'lucide-react';

const TimePickerModal = ({ isOpen, onClose, onSelect, initialValue }) => {
    const [step, setStep] = useState('hour'); // 'hour' ou 'minute'
    const [selectedHour, setSelectedHour] = useState(null);

    // Reseta o estado ao abrir
    useEffect(() => {
        if (isOpen) {
            setStep('hour');
            if (initialValue) {
                const [h] = initialValue.split(':');
                setSelectedHour(h);
            }
        }
    }, [isOpen, initialValue]);

    if (!isOpen) return null;

    const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
    const minutes = ['00', '15', '30', '45'];

    const handleHourClick = (h) => {
        setSelectedHour(h);
        setStep('minute');
    };

    const handleMinuteClick = (m) => {
        onSelect(`${selectedHour}:${m}`);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#121620] border border-white/10 rounded-2xl shadow-2xl w-[320px] overflow-hidden transform transition-all scale-100">
                {/* Header do Modal */}
                <div className="bg-[#0B0F1A] p-4 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {step === 'minute' && (
                            <button onClick={() => setStep('hour')} className="text-gray-400 hover:text-white transition-colors">
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                        )}
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest text-[#D6B46A]">
                            {step === 'hour' ? 'Escolha a Hora' : `Hora: ${selectedHour}h`}
                        </h3>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Corpo do Modal */}
                <div className="p-4">
                    {step === 'hour' && (
                        <div className="grid grid-cols-6 gap-2">
                            {hours.map((h) => (
                                <button
                                    key={h}
                                    onClick={() => handleHourClick(h)}
                                    className={`
                    h-10 rounded-lg text-sm font-bold tabular-nums transition-all border
                    ${selectedHour === h
                                            ? 'bg-[#D6B46A] text-black border-[#D6B46A] shadow-[0_0_10px_rgba(214,180,106,0.4)]'
                                            : 'bg-white/5 border-white/5 text-gray-300 hover:bg-white/10 hover:border-white/20'
                                        }
                  `}
                                >
                                    {h}
                                </button>
                            ))}
                        </div>
                    )}

                    {step === 'minute' && (
                        <div className="flex flex-col gap-4">
                            <p className="text-xs text-center text-gray-400 uppercase tracking-widest">Selecione os minutos</p>
                            <div className="grid grid-cols-2 gap-3">
                                {minutes.map((m) => (
                                    <button
                                        key={m}
                                        onClick={() => handleMinuteClick(m)}
                                        className="h-14 rounded-xl bg-white/5 border border-white/5 text-xl font-bold text-white hover:bg-[#D6B46A]/20 hover:border-[#D6B46A] hover:text-[#D6B46A] transition-all tabular-nums"
                                    >
                                        :{m}
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
