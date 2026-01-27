# Perguntas e Respostas (FAQ)

### 1. O sistema tira a autonomia do Gerente?
**Não.** O Antigravity é um "Co-piloto". Ele sugere a melhor configuração matemática. O gerente ainda pode (e deve) ajustar casos humanos (ex: "João precisa sair cedo hoje para o dentista"). A ferramenta mostra o *custo* dessa decisão, mas não a impede.

### 2. Por que ele mudou meu horário de almoço para 16h?
Provavelmente porque às 12h, 13h e 14h a loja tem um fluxo ou conversão que demanda sua presença. O algoritmo calculou que sua presença às 13h vale mais para a meta da equipe do que às 16h.

### 3. O que acontece se a internet cair?
O cálculo é feito localmente no navegador (client-side) com os dados carregados. Uma vez carregado o Excel, você não precisa de internet para rodar as simulações.

### 4. Ele considera leis trabalhistas?
**Sim.**
*   Intervalo mínimo de 1 hora.
*   Não coloca intervalo na primeira hora de trabalho (Golden Hour de preparação).
*   Não coloca intervalo na última hora (Fechamento).
*   Respeita a carga horária total contratada.

### 5. Como ele sabe a "Conversão"?
Ele lê do arquivo de "Fluxo de Loja" (Cupons/Entrantes). Se o arquivo contiver a coluna `% Conversão` (padrão de sistemas de contagem de fluxo), ele usa. Se não tiver, ele otimiza apenas pelo Fluxo de pessoas.
