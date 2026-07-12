## Objetivo
Usar a imagem enviada como banner principal da landing page (`/`).

## Mudanças

1. **Enviar a imagem para Lovable Assets** (sem duplicar binário no repo):
   - `lovable-assets create --file /mnt/user-uploads/ChatGPT_Image_12_de_jul._de_2026_16_27_45.png --filename academia-remax-banner.png > src/assets/academia-remax-banner.png.asset.json`

2. **Editar `src/routes/index.tsx`** — seção hero:
   - Substituir o card decorativo à direita (o `<div>` com `BrandMark`, "Ao vivo" e o `PlayCircle`) por um `<img>` renderizando o banner enviado, com `rounded-2xl`, sombra e `object-cover`.
   - Manter `alt` descritivo ("Academia RE/MAX — Treinamento que transforma").
   - Manter o restante do hero (título, subtítulo, botões, chips com ícones) intacto.

## Fora do escopo
- Não alterar textos, cores, tokens, header, footer ou outras rotas.
- Não trocar o `og:image` (a imagem é enviada como asset comum do hero).
