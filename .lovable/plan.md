# Ajustar ícones PWA para ficarem "todo preenchido"

## Problema
O ícone atual do app (screenshot anexado) mostra o logo RE/MAX dentro de um quadrado branco com cantos arredondados, deixando uma borda clara ao redor. O usuário quer que o ícone ocupe todo o espaço, sem essa borda branca.

## Solução
Regerar os ícones PWA a partir do logo original, mas com um fundo escuro (azul marinho/preto) que se funda com as bordas do círculo do logo. Isso faz o ícone parecer preenchido de ponta a ponta, eliminando o contraste entre o logo e o fundo do quadrado.

## Arquivos alterados
- `public/icons/icon-192.png`
- `public/icons/icon-512.png`
- `public/icons/icon-maskable-512.png`
- `public/apple-touch-icon.png`

## O que não muda
- `public/manifest.webmanifest` permanece igual (só referencia os mesmos caminhos de ícone).
- `src/routes/__root.tsx` permanece igual.
- Não adicionamos service worker nem funcionalidade offline.

## Resultado esperado
Ao instalar o app na tela inicial, o ícone aparecerá como um quadrado sólido de cor escura com o logo preenchendo o espaço, sem borda branca visível.