import React from 'react';
import { Download, Upload, BarChart3, Activity } from 'lucide-react';
import { Button } from "@/components/ui/button";

const ChartToggleButton = ({ type, current, setType }) => {
    const isActive = type === current;
    const Icon = type === 'line' ? Activity : BarChart3;
    return (
        <Button
            variant={isActive ? "default" : "ghost"}
            size="icon"
            onClick={() => setType(type)}
            className="h-8 w-8"
        >
            <Icon className="w-4 h-4" />
        </Button>
    );
};

const Controls = ({ diasAbreviados, fullDayNames, selectedDay, setSelectedDay, chartType, setChartType, toggleTheme, theme, setShowUploadSection, exportData }) => (
    <div className="flex-none px-6 py-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 flex flex-wrap items-center justify-between gap-4 h-14">
        <div className="flex bg-muted rounded-lg p-1 overflow-x-auto scrollbar-hide max-w-full gap-1">
            {['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'].map((day) => {
                const fullDay = {
                    'SEG': 'SEGUNDA', 'TER': 'TERÇA', 'QUA': 'QUARTA', 'QUI': 'QUINTA',
                    'SEX': 'SEXTA', 'SAB': 'SÁBADO', 'DOM': 'DOMINGO'
                }[day];
                const isActive = selectedDay === fullDay;
                return (
                    <Button
                        key={day}
                        variant={isActive ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setSelectedDay(fullDay)}
                        className="h-7 text-[10px] font-bold px-3 transition-all"
                    >
                        {day}
                    </Button>
                );
            })}
        </div>

        <div className="flex items-center gap-2 ml-auto">
            <div className="flex bg-muted rounded-md p-0.5 border">
                <ChartToggleButton type="composed" current={chartType} setType={setChartType} />
                <ChartToggleButton type="bar" current={chartType} setType={setChartType} />
            </div>
            <Button
                onClick={exportData}
                variant="default"
                size="sm"
                className="h-8 text-[10px] font-bold uppercase tracking-wider gap-2 bg-[#D6B46A] hover:bg-[#D6B46A]/90 text-black"
            >
                <Download className="w-3 h-3" /> Exportar
            </Button>
            <Button
                onClick={() => setShowUploadSection(prev => !prev)}
                variant="outline"
                size="sm"
                className="h-8 text-[10px] font-semibold gap-2"
            >
                <Upload className="w-3 h-3" />
            </Button>
        </div>
    </div>
);

export default Controls;
