# Fórmulas e Definições Técnicas (V2.1)

O coração do Antigravity é regido pela Física de Varejo (Retail Physics). Abaixo, as definições matemáticas exatas usadas no código fonte (`thermalBalance.js`).

## 1. Pressão (Pressure)
A medida de força exercida pelo fluxo sobre a equipe.

$$ P_t = \frac{Fluxo_t}{Staff_t} $$

*   $P_t$: Pressão no tempo $t$.
*   $Fluxo_t$: Número de clientes entrantes no slot $t$.
*   $Staff_t$: Número de vendedores ativos (excluindo pausas) no slot $t$.
*   *Nota*: Se $Staff = 0$ e $Fluxo > 0$, a Pressão tende ao infinito (penalidade máxima).

## 2. Peso de Oportunidade ($W_{opt}$) - **[NOVO V2.1]**
Um multiplicador que agrava a importância de um horário baseado na "dor" da perda de vendas.

$$ W_{opt} = 1.0 + \left( \frac{Fluxo}{100} \times \text{PenalidadeConversão} \right) $$

Onde:
$$ \text{PenalidadeConversão} = \max\left(0, \frac{\text{MetaIdeal} - \text{ConversãoReal}}{\text{MetaIdeal}}\right) $$

*   Se a loja bate a meta de conversão, o peso é 1.0 (Neutro).
*   Se a conversão cai para a metade da meta em hora de pico, o peso sobe drasticamente, forçando o algoritmo a cobrir esse horário.

## 3. Função de Custo Total ($J$)
O valor que o algoritmo tenta **MINIMIZAR**. Representa o "Desconforto Térmico Total" da loja.

$$ J = \sum_{t=0}^{96} \left[ \left( \frac{Fluxo_t}{Staff_t} \right)^2 \times Fluxo_t \times W_{opt}(t) \right] $$

*   **Quadrático**: O termo ao quadrado $\left(\frac{F}{S}\right)^2$ penaliza desproporcionalmente os erros grandes.
    *   Faltar 1 pessoa quando se precisa de 2 (Erro 50%) é **4x pior** do que faltar 1 quando se precisa de 4.
*   **Ponderado pelo Fluxo**: Errar em horário de pico custa mais caro.
*   **Ponderado pela Oportunidade**: Errar em horário de baixa conversão custa AINDA mais caro.

## 4. Índice Térmico ($\theta$)
Uma normalização da pressão para facilitar a leitura humana (Gráfico de Cores).

$$ \theta_t = \frac{P_t}{\mu} $$

Onde $\mu$ (Mu) é a pressão média do dia:
$$ \mu = \frac{\sum Fluxo}{\sum Staff} $$

*   $\theta > 1.20$: **QUENTE** (Falta gente)
*   $\theta < 0.80$: **FRIO** (Sobra gente)
*   $\theta \approx 1.00$: **EQUILÍBRIO IDEAL**
