import React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const DailyStaffList = ({ staffRows, selectedDay, onTimeEdit }) => {
    const colabsDoDia = staffRows.filter(r => r.dia === selectedDay && r.nome !== '');

    return (
        <div className="flex flex-col h-full space-y-4">
            <div className="flex justify-between items-center px-4 py-2 bg-muted/20 rounded-lg">
                <h3 className="text-sm font-bold tracking-tight uppercase text-muted-foreground">
                    Escala: <span className="text-primary ml-1">{selectedDay}</span>
                </h3>
                <Badge variant="outline" className="font-mono text-xs">
                    {colabsDoDia.length} PESSOAS
                </Badge>
            </div>

            <div className="rounded-xl border h-full overflow-hidden shadow-sm bg-card">
                <div className="h-full overflow-y-auto custom-scroll">
                    <Table>
                        <TableHeader className="bg-muted/50 sticky top-0 z-10 backdrop-blur-sm shadow-sm">
                            <TableRow className="hover:bg-transparent border-b-primary/10">
                                <TableHead className="w-[140px] text-xs font-bold uppercase tracking-wider pl-4">Colaborador</TableHead>
                                <TableHead className="text-center text-xs font-bold uppercase tracking-wider">Entrada</TableHead>
                                <TableHead className="text-center text-xs font-bold uppercase tracking-wider">Almoço</TableHead>
                                <TableHead className="text-center text-xs font-bold uppercase tracking-wider">Saída</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {colabsDoDia.map((colab) => (
                                <TableRow key={colab.id} className="group hover:bg-muted/40 transition-colors border-b-muted/50">
                                    <TableCell className="font-medium py-2 pl-4">
                                        <div className="flex flex-col">
                                            <span className="truncate max-w-[120px] font-semibold text-foreground/90 group-hover:text-primary transition-colors" title={colab.nome}>{colab.nome}</span>
                                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{colab.cargo || 'COLAB'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center p-0">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-full font-mono text-xs hover:bg-primary/10 hover:text-primary"
                                            onClick={() => onTimeEdit && onTimeEdit(colab.id, 'entrada', colab.entrada)}
                                        >
                                            {colab.entrada ? colab.entrada.slice(0, 5) : '--:--'}
                                        </Button>
                                    </TableCell>
                                    <TableCell className="text-center p-0">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-full font-mono text-xs text-muted-foreground hover:bg-primary/10 hover:text-primary"
                                            onClick={() => onTimeEdit && onTimeEdit(colab.id, 'intervalo', colab.intervalo)}
                                        >
                                            {colab.intervalo ? colab.intervalo.slice(0, 5) : '--:--'}
                                        </Button>
                                    </TableCell>
                                    <TableCell className="text-center p-0">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-full font-mono text-xs font-bold hover:bg-primary/10 hover:text-primary"
                                            onClick={() => onTimeEdit && onTimeEdit(colab.id, 'saida', colab.saida)}
                                        >
                                            {colab.saida ? colab.saida.slice(0, 5) : '--:--'}
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
};

export default DailyStaffList;
