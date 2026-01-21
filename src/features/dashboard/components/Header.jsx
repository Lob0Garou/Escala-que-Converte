import React from 'react';

const Header = () => (
    <header className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b h-14 flex-none flex items-center justify-between px-6 z-20 shadow-sm">
        <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold tracking-tight flex items-center gap-3">
                Escala de Alta Performance
                <div className="h-4 w-px bg-border mx-2"></div>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-primary border border-primary/20 bg-primary/5 px-2 py-0.5 rounded-full">Pro v2</span>
            </h1>
        </div>
        <div className="flex items-center gap-4">
            <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest tabular-nums opacity-60">
                {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })}
            </div>
        </div>
    </header>
);

export default Header;
