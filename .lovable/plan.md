## Objetivo
Trocar o quadrado "R" do logo no header pela imagem do logo Academia RE/MAX enviada.

## Mudanças
1. Upload da imagem para Lovable Assets: `src/assets/academia-remax-logo.png.asset.json`.
2. Em `src/components/site-header.tsx` (`BrandMark`): substituir o `<div>` com "R" (linhas 11–13) por um `<img>` do logo com `h-10 w-10 object-contain`, `alt="Academia RE/MAX"`. O texto ao lado ("RE/MAX Academy / Treinamentos") permanece igual.

## Fora do escopo
- Não alterar o texto do brand, nav, botões ou outras rotas.
- Não trocar favicon nem og:image.
