# 🎨 Dashboard Premium - Snippets Prontos para Uso

## 📦 Imports Necessários

```jsx
import React, { useState, useCallback, useMemo, useEffect, useRef, forwardRef } from 'react';
import html2canvas from 'html2canvas';
import { 
  Upload, TrendingUp, Users, AlertCircle, Plus, Trash2, Clock, X, 
  ChevronLeft, Download, Thermometer, Zap, Activity, BarChart3, 
  Sparkles, Calendar 
} from 'lucide-react';
import { 
  LineChart, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, Line as RechartsLine, ComposedChart, 
  ReferenceDot, Area, LabelList 
} from 'recharts';
```

---

## 🎯 Componente: Header Premium

```jsx
const PremiumHeader = () => (
  <header className="relative bg-gradient-to-r from-[#0B0F1A] via-[#121620] to-[#0B0F1A] border-b border-[#D6B46A]/10 h-20 flex-none flex items-center justify-between px-8 z-20 shadow-[0_4px_30px_rgba(0,0,0,0.5)] backdrop-blur-3xl overflow-hidden">
    {/* Background Decorative Elements */}
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#D6B46A]/5 via-transparent to-transparent opacity-50"></div>
    <div className="absolute top-0 left-0 w-64 h-64 bg-[#D6B46A]/5 rounded-full blur-3xl -translate-x-32 -translate-y-32"></div>
    <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl translate-x-48 -translate-y-48"></div>
    
    <div className="relative flex items-center gap-6">
      {/* Logo/Brand */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#D6B46A] to-[#b8955a] flex items-center justify-center shadow-[0_0_20px_rgba(214,180,106,0.3)] transform hover:scale-110 transition-transform duration-300">
          <Sparkles className="w-6 h-6 text-black" />
        </div>
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-3 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Escala de Alta Performance
          </h1>
          <p className="text-xs text-gray-500 font-bold tracking-wider">Sistema Inteligente de Alocação</p>
        </div>
      </div>
      
      <div className="h-10 w-px bg-gradient-to-b from-transparent via-[#D6B46A]/30 to-transparent"></div>
      
      {/* Badge Premium */}
      <div className="px-4 py-1.5 rounded-full bg-gradient-to-r from-[#D6B46A]/10 to-transparent border border-[#D6B46A]/20 backdrop-blur-xl">
        <span className="text-xs font-black uppercase tracking-[0.2em] bg-gradient-to-r from-[#D6B46A] to-[#fae8b6] bg-clip-text text-transparent">
          Pro Edition v2.0
        </span>
      </div>
    </div>

    {/* Right Section - Status & Date */}
    <div className="relative flex items-center gap-6">
      <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/[0.03] border border-white/10 backdrop-blur-xl">
        <Calendar className="w-4 h-4 text-[#D6B46A]" />
        <div className="text-right">
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Hoje</p>
          <p className="text-xs font-black text-white tabular-nums">
            {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
          </p>
        </div>
      </div>
      
      {/* Live Status Indicator */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">Live</span>
      </div>
    </div>
  </header>
);
```

---

## 💳 Componente: KPI Card Premium

```jsx
const PremiumKPICard = ({ 
  type = 'default', // 'alert', 'success', 'info', 'primary'
  label, 
  value, 
  subtitle,
  icon: Icon 
}) => {
  const variants = {
    alert: {
      bg: 'from-red-500/10 to-transparent',
      border: 'border-red-500/20 hover:border-red-500/40',
      glow: 'bg-red-500/10',
      labelColor: 'text-red-400/70',
      valueColor: 'text-red-500',
      subtitleColor: 'text-red-300/80',
      shadow: 'hover:shadow-[0_10px_40px_rgba(239,68,68,0.2)]'
    },
    success: {
      bg: 'from-emerald-500/10 to-transparent',
      border: 'border-emerald-500/20 hover:border-emerald-500/40',
      glow: 'bg-emerald-500/10',
      labelColor: 'text-emerald-400/70',
      valueColor: 'text-emerald-500',
      subtitleColor: 'text-emerald-300/80',
      shadow: 'hover:shadow-[0_10px_40px_rgba(16,185,129,0.2)]'
    },
    info: {
      bg: 'from-blue-500/10 to-transparent',
      border: 'border-blue-500/20 hover:border-blue-500/40',
      glow: 'bg-blue-500/10',
      labelColor: 'text-blue-400/70',
      valueColor: 'text-blue-400',
      subtitleColor: 'text-blue-300/70',
      shadow: 'hover:shadow-[0_10px_40px_rgba(59,130,246,0.2)]'
    },
    primary: {
      bg: 'from-[#D6B46A]/10 to-transparent',
      border: 'border-[#D6B46A]/20 hover:border-[#D6B46A]/40',
      glow: 'bg-[#D6B46A]/10',
      labelColor: 'text-[#D6B46A]/70',
      valueColor: 'text-[#D6B46A]',
      subtitleColor: 'text-[#D6B46A]/70',
      shadow: 'hover:shadow-[0_10px_40px_rgba(214,180,106,0.2)]'
    }
  };

  const v = variants[type];

  return (
    <div className={`group relative bg-gradient-to-br ${v.bg} backdrop-blur-xl border ${v.border} rounded-2xl p-6 flex flex-col overflow-hidden transition-all duration-500 ${v.shadow}`}>
      {/* Glow Effect */}
      <div className={`absolute top-0 right-0 w-32 h-32 ${v.glow} rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
      
      {/* Icon (Optional) */}
      {Icon && (
        <div className="relative mb-3">
          <Icon className={`w-5 h-5 ${v.valueColor}`} />
        </div>
      )}
      
      {/* Label */}
      <span className={`relative ${v.labelColor} text-xs font-black uppercase tracking-[0.15em] mb-3`}>
        {label}
      </span>
      
      {/* Value */}
      <div className="relative flex flex-col">
        <span className={`text-4xl font-black ${v.valueColor} mb-2`}>
          {value}
        </span>
        
        {/* Subtitle */}
        {subtitle && (
          <div className={`text-xs ${v.subtitleColor} font-mono`}>
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
};

// Uso:
<PremiumKPICard
  type="alert"
  label="Alerta de Quedas"
  value={criticalDrops}
  subtitle={`Horários: ${horasCriticas.join(', ')}`}
  icon={AlertCircle}
/>
```

---

## 🕐 Componente: Time Picker Modal

```jsx
const PremiumTimePicker = ({ isOpen, onClose, onSelect, initialValue }) => {
  const [step, setStep] = useState('hour');
  const [selectedHour, setSelectedHour] = useState(null);

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

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="bg-[#0B0F1A]/95 backdrop-blur-3xl border border-[#D6B46A]/20 rounded-3xl shadow-[0_20px_80px_rgba(0,0,0,0.6)] w-[360px] overflow-hidden transform transition-all scale-100 hover:scale-[1.01]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#D6B46A]/10 via-transparent to-transparent p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {step === 'minute' && (
              <button 
                onClick={() => setStep('hour')} 
                className="text-gray-400 hover:text-[#D6B46A] transition-all hover:scale-110"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h3 className="text-xs font-black text-[#D6B46A] uppercase tracking-[0.2em]">
                {step === 'hour' ? 'Selecione a Hora' : 'Selecione os Minutos'}
              </h3>
              {step === 'minute' && (
                <p className="text-2xl font-black text-white tabular-nums mt-1">
                  {selectedHour}h
                </p>
              )}
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-white transition-all hover:rotate-90 duration-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {step === 'hour' && (
            <div className="grid grid-cols-6 gap-2.5">
              {hours.map((h) => (
                <button
                  key={h}
                  onClick={() => {
                    setSelectedHour(h);
                    setStep('minute');
                  }}
                  className={`
                    h-12 rounded-xl text-sm font-black tabular-nums transition-all duration-200 border backdrop-blur-sm transform hover:scale-105 active:scale-95
                    ${selectedHour === h
                      ? 'bg-gradient-to-br from-[#D6B46A] to-[#b8955a] text-black border-[#D6B46A] shadow-[0_0_20px_rgba(214,180,106,0.5)]'
                      : 'bg-white/[0.03] border-white/10 text-gray-300 hover:bg-white/[0.08] hover:border-[#D6B46A]/30'
                    }
                  `}
                >
                  {h}
                </button>
              ))}
            </div>
          )}

          {step === 'minute' && (
            <div className="space-y-5">
              <p className="text-xs text-center text-gray-500 uppercase tracking-[0.2em] font-bold">
                Escolha os minutos
              </p>
              <div className="grid grid-cols-2 gap-4">
                {minutes.map((m) => (
                  <button
                    key={m}
                    onClick={() => {
                      onSelect(`${selectedHour}:${m}`);
                      onClose();
                    }}
                    className="h-16 rounded-2xl bg-gradient-to-br from-white/[0.05] to-transparent border border-white/10 text-2xl font-black text-white hover:bg-gradient-to-br hover:from-[#D6B46A]/20 hover:to-transparent hover:border-[#D6B46A] hover:text-[#D6B46A] transition-all duration-300 tabular-nums backdrop-blur-xl transform hover:scale-105 active:scale-95"
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
```

---

## 🎛️ Componente: Day Selector Premium

```jsx
const PremiumDaySelector = ({ selectedDay, onDayChange }) => {
  const days = [
    { short: 'SEG', full: 'SEGUNDA' },
    { short: 'TER', full: 'TERÇA' },
    { short: 'QUA', full: 'QUARTA' },
    { short: 'QUI', full: 'QUINTA' },
    { short: 'SEX', full: 'SEXTA' },
    { short: 'SAB', full: 'SÁBADO' },
    { short: 'DOM', full: 'DOMINGO' }
  ];

  return (
    <div className="flex bg-[#121620]/80 rounded-2xl p-1.5 border border-white/10 overflow-x-auto scrollbar-hide backdrop-blur-xl shadow-lg">
      {days.map(({ short, full }) => {
        const isActive = selectedDay === full;
        return (
          <button
            key={short}
            onClick={() => onDayChange(full)}
            className={`
              relative px-5 py-2.5 rounded-xl text-xs font-black transition-all duration-300 whitespace-nowrap tracking-wider overflow-hidden
              ${isActive 
                ? 'bg-gradient-to-r from-[#D6B46A] to-[#b8955a] text-black shadow-[0_4px_20px_rgba(214,180,106,0.4)] scale-105' 
                : 'text-gray-400 hover:text-white hover:bg-white/5'
              }
            `}
          >
            {isActive && (
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent animate-pulse"></div>
            )}
            <span className="relative">{short}</span>
          </button>
        );
      })}
    </div>
  );
};
```

---

## 📊 Componente: Chart Container Premium

```jsx
const PremiumChartContainer = ({ title, subtitle, children, actions }) => (
  <div className="relative w-full bg-gradient-to-br from-[#1E293B]/80 to-[#0F172A]/80 backdrop-blur-3xl border border-white/10 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.4)] p-8 overflow-hidden group hover:border-[#D6B46A]/20 transition-all duration-500">
    
    {/* Background Decorative Gradient */}
    <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-[#D6B46A]/5 to-transparent rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
    
    {/* Header */}
    <div className="relative flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        <div className="w-1 h-8 bg-gradient-to-b from-[#D6B46A] to-transparent rounded-full"></div>
        <div>
          <h3 className="text-sm font-black text-white uppercase tracking-[0.15em]">
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      
      {/* Actions (Optional) */}
      {actions && (
        <div className="flex items-center gap-3">
          {actions}
        </div>
      )}
    </div>
    
    {/* Content */}
    <div className="relative flex-1 w-full min-h-0">
      {children}
    </div>
  </div>
);

// Uso:
<PremiumChartContainer
  title="Relatório de Capacidade"
  subtitle="Análise em tempo real"
  actions={
    <button className="px-4 py-2 rounded-xl bg-[#D6B46A] text-black font-black">
      Otimizar
    </button>
  }
>
  <ResponsiveContainer width="100%" height={420}>
    {/* Chart aqui */}
  </ResponsiveContainer>
</PremiumChartContainer>
```

---

## 📤 Componente: Upload Box Premium

```jsx
const PremiumUploadBox = ({ 
  title, 
  subtitle, 
  onFileSelect, 
  accept = '.xlsx,.xls',
  isDragging = false,
  onDragStateChange,
  hasData = false,
  dataCount = 0
}) => {
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onDragStateChange?.(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) onFileSelect(file);
  };

  return (
    <div
      className={`
        group relative bg-gradient-to-br from-[#121620]/80 to-[#0B0F1A]/80 backdrop-blur-3xl border rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.4)] p-8 h-[360px] overflow-hidden transition-all duration-500
        ${isDragging 
          ? 'border-[#D6B46A] bg-[#D6B46A]/5 shadow-[0_20px_80px_rgba(214,180,106,0.2)]' 
          : 'border-white/10 hover:border-[#D6B46A]/30 hover:shadow-[0_20px_80px_rgba(214,180,106,0.1)]'
        }
      `}
      onDragEnter={(e) => {
        e.preventDefault();
        onDragStateChange?.(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={(e) => {
        e.preventDefault();
        onDragStateChange?.(false);
      }}
      onDrop={handleDrop}
    >
      {/* Background Glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#D6B46A]/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      
      <label className="relative block cursor-pointer text-center w-full h-full flex flex-col items-center justify-center">
        {/* Icon */}
        <div className={`
          w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center transition-all duration-300
          ${isDragging 
            ? 'bg-gradient-to-br from-[#D6B46A] to-[#b8955a] scale-110 shadow-[0_0_30px_rgba(214,180,106,0.4)]' 
            : 'bg-white/5 group-hover:bg-white/10 group-hover:scale-110'
          }
        `}>
          <Upload className={`w-10 h-10 transition-colors ${isDragging ? 'text-black' : 'text-gray-500 group-hover:text-[#D6B46A]'}`} />
        </div>
        
        {/* Title */}
        <h3 className="text-xl font-black text-white tracking-tight mb-2">
          {title}
        </h3>
        
        {/* Subtitle */}
        {subtitle && (
          <p className="text-xs text-gray-500 font-medium mb-6">
            {subtitle}
          </p>
        )}
        
        {/* Status */}
        {hasData ? (
          <div className="bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 text-emerald-400 px-5 py-2.5 rounded-full text-xs font-black inline-flex items-center gap-2 border border-emerald-500/20 backdrop-blur-xl">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            ✓ {dataCount} Registros Carregados
          </div>
        ) : (
          <p className="text-gray-500 text-sm font-medium">
            Arraste ou clique para carregar
            <span className="block text-xs text-gray-600 mt-1">{accept}</span>
          </p>
        )}
        
        <input 
          type="file" 
          accept={accept} 
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFileSelect(file);
          }}
          className="hidden" 
        />
      </label>
    </div>
  );
};
```

---

## 🔲 Componente: Loading Overlay Premium

```jsx
const PremiumLoadingOverlay = ({ message = "Processando Dados" }) => (
  <div className="fixed inset-0 bg-[#0B0F1A]/95 flex items-center justify-center z-50 backdrop-blur-2xl">
    <div className="relative">
      {/* Animated Rings */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-32 h-32 rounded-full border-4 border-[#D6B46A]/20 animate-pulse"></div>
        <div className="absolute w-24 h-24 rounded-full border-4 border-[#D6B46A]/40 animate-spin" style={{ animationDuration: '3s' }}></div>
        <div className="absolute w-16 h-16 rounded-full border-4 border-[#D6B46A] animate-spin" style={{ animationDuration: '1.5s' }}></div>
      </div>
      
      {/* Center Content */}
      <div className="relative bg-[#121620]/80 backdrop-blur-xl border border-[#D6B46A]/20 rounded-3xl p-12 shadow-[0_20px_80px_rgba(0,0,0,0.6)] text-center">
        <Sparkles className="w-12 h-12 text-[#D6B46A] mx-auto mb-6 animate-pulse" />
        <p className="text-gray-300 font-black text-lg mb-2">{message}</p>
        <p className="text-gray-500 text-sm font-medium">Aguarde um momento...</p>
      </div>
    </div>
  </div>
);
```

---

## 🎨 CSS Global Personalizado

```jsx
// Adicione dentro de um componente ou em App.jsx:
<style jsx global>{`
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  
  * {
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
  }
  
  /* Custom Scrollbar */
  .custom-scroll::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  
  .custom-scroll::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.02);
    border-radius: 10px;
  }
  
  .custom-scroll::-webkit-scrollbar-thumb {
    background: linear-gradient(
      180deg,
      rgba(214, 180, 106, 0.3),
      rgba(214, 180, 106, 0.5)
    );
    border-radius: 10px;
  }
  
  .custom-scroll::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(
      180deg,
      rgba(214, 180, 106, 0.5),
      rgba(214, 180, 106, 0.7)
    );
  }
  
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
  
  /* Keyframes */
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  .animate-in {
    animation: fadeIn 0.4s ease-out forwards;
  }
  
  .animate-slide-up {
    animation: slideUp 0.5s ease-out forwards;
  }
`}</style>
```

---

## 🎯 Paleta de Cores (Tailwind Config)

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        gold: {
          light: '#fae8b6',
          DEFAULT: '#D6B46A',
          dark: '#b8955a',
        },
        dark: {
          primary: '#0B0F1A',
          secondary: '#121620',
          tertiary: '#1E293B',
        }
      },
      boxShadow: {
        'glow': '0 0 20px rgba(214, 180, 106, 0.3)',
        'glow-intense': '0 0 30px rgba(214, 180, 106, 0.5)',
        'card': '0 20px 60px rgba(0, 0, 0, 0.4)',
        'card-hover': '0 30px 80px rgba(0, 0, 0, 0.5)',
      },
      backdropBlur: {
        xs: '2px',
      }
    }
  }
}
```

---

## ✨ Micro-Interações Essenciais

```jsx
// Hover Scale + Shadow
<button className="transform hover:scale-105 hover:shadow-glow transition-all duration-300">
  Clique Aqui
</button>

// Rotate on Hover
<X className="hover:rotate-90 transition-transform duration-300" />

// Pulse Effect
<div className="animate-pulse">
  {/* Conteúdo */}
</div>

// Ping Effect (Live Indicator)
<span className="relative flex h-2 w-2">
  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
</span>

// Gradient Text
<h1 className="bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
  Título Premium
</h1>

// Glassmorphic Card
<div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-6">
  {/* Conteúdo */}
</div>

// Hover Glow Effect
<div className="group relative">
  <div className="absolute inset-0 bg-[#D6B46A]/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
  {/* Conteúdo */}
</div>
```

---

## 🚀 Template de Página Completa

```jsx
const PremiumDashboard = () => {
  return (
    <div className="min-h-screen w-full bg-[#0B0F1A] flex flex-col relative overflow-hidden">
      {/* Background Pattern */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.015] z-0" />
      <div className="pointer-events-none absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#D6B46A]/5 via-transparent to-blue-500/5 opacity-30" />
      
      {/* Global Styles */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { font-family: 'Inter', sans-serif; }
      `}</style>

      <div className="w-full flex-1 flex flex-col relative z-10">
        {/* Header */}
        <PremiumHeader />
        
        {/* Main Content */}
        <main className="flex-1 p-8">
          {/* Seu conteúdo aqui */}
        </main>
      </div>
    </div>
  );
};
```

---

**Pronto para uso! Copie e cole os snippets conforme necessário.** ✨
