## Alteração
Aplicar borda arredondada (formato circular) na imagem da logo no componente `src/components/site-header.tsx`, mantendo o tamanho e o espaçamento atuais.

## Detalhes técnicos
- No `<img>` da logo (linha 12), adicionar classes Tailwind para borda circular: `rounded-full`.
- Opcionalmente adicionar `border border-border` se for necessário um contorno sutil, mas manter o visual limpo como padrão.

## Escopo
- Apenas ajuste visual no componente do cabeçalho.
- Nenhuma alteração em lógica, dados ou outras páginas.

## Arquivo alterado
- `src/components/site-header.tsx`