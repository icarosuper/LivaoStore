- Gerenciamento de clientes
    - Quero guardar o cliente no banco para algumas coisas
        - Listar métricas dos clientes em uma tabela na dashboard
        - Deixar cliente cancelar o próprio pedido
    - Talvez pedir nome, número e TaxNumber dele em alguns lugares e salvar no LocalStorage e no banco(?)
    - Talvez implementar login para cliente, mas eu não queria fazer isso

- /admin funcionalidades
    - admin deve poder criar transações feitas por fora para trackear
        
- /admin/produtos
    - switch de produto ativo
        - colocar uma animação durante o loading do switch de produto ativo e bloquear ele durante o loading

- /admin/pedidos
    - melhorar estilização
        - cada status tem uma cor diferente
    - adicionar filtros e sorting
        - Filtros: status, nome/numero do cliente (um campo string que procura as duas coisas), produto, range de data
        - Sort: data e preço
    - adicionar botão separado pra ver pedidos pendentes sort created asc

- Layout da página /admin
    - Adicionar tab clientes
    - Tabs devem alterar url
    
- Pedidos
    - Não permitir usuário adicionar itens indisponíveis
    - Tratar carrinhos com itens indisponíveis

- Criar testes
    - Unitários
    - Componente
    - Smoke
    - E2E
