import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

const SimpleDayCard = ({ dia, staffRows }) => {
    const colabsDoDia = staffRows.filter(r => r.dia === dia && r.nome !== '');

    return (
        <Card className="overflow-hidden hover:border-primary/50 transition-colors">
            <CardHeader className="bg-muted/50 py-3 border-b">
                <CardTitle className="text-sm font-bold tracking-widest uppercase text-center">{dia}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="h-8 text-[10px] w-[80px]">ATLETA</TableHead>
                            <TableHead className="h-8 text-[10px] text-center p-0">ENT</TableHead>
                            <TableHead className="h-8 text-[10px] text-center p-0">INT</TableHead>
                            <TableHead className="h-8 text-[10px] text-center p-0">SAI</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {colabsDoDia.length > 0 ? colabsDoDia.map((colab) => (
                            <TableRow key={colab.id} className="hover:bg-muted/50">
                                <TableCell className="py-2 text-xs font-medium truncate max-w-[80px] uppercase">{colab.nome}</TableCell>
                                <TableCell className="py-2 text-center text-xs tabular-nums p-0 text-muted-foreground">
                                    {colab.entrada ? colab.entrada.slice(0, 5) : '--'}
                                </TableCell>
                                <TableCell className="py-2 text-center text-xs tabular-nums p-0 text-muted-foreground">
                                    {colab.intervalo ? colab.intervalo.slice(0, 5) : '--'}
                                </TableCell>
                                <TableCell className="py-2 text-center text-xs tabular-nums p-0 font-bold text-primary">
                                    {colab.saida ? colab.saida.slice(0, 5) : '--'}{colab.saidaDiaSeguinte ? '⁺¹' : ''}
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan="4" className="py-8 text-center text-muted-foreground text-xs uppercase tracking-widest">
                                    Folga Geral
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};

const WeeklyScaleView = ({ staffRows }) => {
    const dias = ['SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÁBADO', 'DOMINGO'];
    return (
        <div className="p-8 bg-muted/20 border rounded-3xl">
            <h3 className="text-xl font-black uppercase tracking-[0.3em] text-center mb-10 text-muted-foreground">Escala Semanal</h3>
            <div className="flex flex-col gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {dias.slice(0, 4).map(dia => <SimpleDayCard key={dia} dia={dia} staffRows={staffRows} />)}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-[75%] mx-auto w-full">
                    {dias.slice(4).map(dia => <SimpleDayCard key={dia} dia={dia} staffRows={staffRows} />)}
                </div>
            </div>
        </div>
    );
};

export default WeeklyScaleView;
