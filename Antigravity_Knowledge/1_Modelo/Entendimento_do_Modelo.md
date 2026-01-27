# Entendimento do Modelo Antigravity (V2.1)

## O Conceito "Antigravity"
O **Antigravity** não é apenas um gerador de escalas; é um **Motor de Otimização de Ganho Marginal Determinístico**. 

Ao contrário de sistemas tradicionais que apenas verificam restrições (ex: "tem gente suficiente?"), o Antigravity busca ativamente a **eficiência máxima**, movendo a força de trabalho (Staff) para onde ela gera mais valor financeiro.

### Diferença Fundamental (V1 vs V2.1)

| Característica | Escala Manual / V1 | Antigravity V2.1 |
| :--- | :--- | :--- |
| **Abordagem** | Heurística ("Acho que precisa de gente às 14h") | **Matemática** (Custo Quadrático Ponderado) |
| **Foco** | Cobrir buracos | **Maximizar Retorno (ROI)** |
| **Intervalos** | Horários fixos/padrão (11h, 12h) | **Dinâmicos** (Movem-se para cobrir picos) |
| **Visão** | "Quantas pessoas tenho?" | **"Qual a pressão de venda por pessoa?"** |
| **Prioridade** | Igual para todas as horas | **Ponderada pela Conversão** (Oportunidade) |

## Como o V2.1 Pensa (Opportunity-Weighted)

O motor V2.1 introduz o conceito de **Oportunidade de Receita**. 
Ele entende que **nem todo fluxo é igual**.

1.  **Cenário A**: 100 clientes entram, Conversão histórica é 40%. (A loja vende fácil).
2.  **Cenário B**: 100 clientes entram, Conversão histórica é 5%. (A loja está perdendo venda).

O Antigravity V2.1 **prioriza agressivamente o Cenário B**. Ele entende que se a conversão está baixa com alto fluxo, provavelmente falta atendimento. Ele move staff para lá automaticamente.

---
### Arquitetura do Motor

1.  **Espaço de Estados**: O dia é dividido em 96 slots de 15 minutos.
2.  **Hard Constraints** (Regras Invioláveis):
    *   CLT: 1h de intervalo mínimo.
    *   Turno: Ninguém trabalha mais que o contratado.
    *   Janela: Intervalo não pode ser logo na entrada nem na saída.
3.  **Algoritmo**: *Global Greedy Search* (Busca Gananciosa Global).
    *   A cada iteração, ele simula mover o intervalo de CADA funcionário para CADA slot possível.
    *   Ele calcula: "Se eu mudar o João das 11h para as 11:15h, quanto eu ganho de eficiência global?"
    *   Ele executa o movimento que der o maior ganho.
    *   Repete até que nenhum movimento melhore a escala.
