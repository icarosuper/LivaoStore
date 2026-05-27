- Gerenciamento de clientes
    - Listar métricas dos clientes na dashboard (agregação de orders por whatsapp)
        - Total gasto, número de pedidos, último pedido
    - Identificação: pedir nome e número; salvar no LocalStorage e no banco

- /admin/pedidos
    - adicionar botão separado pra ver pedidos pendentes sort created asc
    - export CSV de pedidos

- Layout da página /admin
    - Adicionar tab clientes
    - Tabs devem alterar url

- Vitrine
    - Busca/filtro de produtos (útil com 20+ produtos)

- Pedidos / Carrinho
    - Não permitir usuário adicionar itens indisponíveis
    - Tratar carrinhos com itens indisponíveis

- Criar testes
    - Unitários
    - Componente
    - Smoke
    - E2E

### Ordem de prioridade:
Tier 1 — Resolve bugs/risco de UX agora
1. Itens indisponíveis no carrinho — cliente pode chegar no checkout com item esgotado e ter erro. Bug real.

Tier 2 — Admin diário funciona melhor
2. Botão pedidos pendentes — operacional: admin abre e vê fila por ordem de chegada. Muito útil no dia a dia.

Tier 3 — Features de valor
3. Export CSV — financeiro, provavelmente vai querer antes do fim do mês.
4. Filtros já implementados — done.

Tier 4 — Quando crescer
5. Aba clientes — depende de ter volume de pedidos para métricas fazerem sentido.
6. Busca na vitrine — só releante com 20+ produtos.
7. Testes — importante mas não bloqueia nada agora; smoke + E2E nas páginas críticas primeiro.
