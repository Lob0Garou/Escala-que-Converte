# Métricas Calculadas no Dashboard

Aqui explicamos o que cada número no painel significa para o Operador.

## 1. Score de Eficiência (0-100)
Uma nota única para a qualidade da escala do dia.
*   **100**: Perfeição Teórica (o gráfico de staff é idêntico ao gráfico de fluxo).
*   **< 70**: Escala Ruim (muitos momentos de ociosidade ou caos).
*   *Cálculo*: Baseado no desvio médio absoluto do Índice Térmico em relação a 1.0.

## 2. Pontos Críticos (Hotspots/Coldspots)
O sistema identifica automaticamente os 3 piores momentos do dia.

### 🔥 Hotspots (Perigo de Perda)
Horários onde o cliente entra e não tem vendedor livre.
*   **Causa**: Intervalos mal posicionados ou troca de turno.
*   **Ação**: O Antigravity move intervalos para Longe destes horários.

### ❄️ Coldspots (Rasgo de Dinheiro)
Horários onde tem vendedor parado conversando.
*   **Causa**: Excesso de staff em abertura/fechamento ou vale de fluxo (14h-15h).
*   **Ação**: O Antigravity move intervalos PARA estes horários.

## 3. Taxa de Conversão vs Capacidade
O gráfico cruza duas linhas vitais:
1.  **Linha Cinza (Demanda)**: Quantos clientes entraram.
2.  **Linha Dourada (Oferta)**: Capacidade de atendimento (Staff Real * Fator de Potência).

*   **Cruzamento da Morte**: Quando a Linha Cinza sobe muito acima da Dourada. É aqui que a conversão despenca.
*   **Objetivo do V2.1**: Garantir que a Linha Dourada esteja sempre "colada" ou levemente acima da Cinza nos momentos de baixa conversão.
