# Corrigir vídeos do YouTube que não abrem

## Problema
No player, quando o campo "ID ou URL do vídeo" recebe uma URL completa (ex.: `https://www.youtube.com/watch?v=ABC123` ou `https://youtu.be/ABC123`), o código atual apenas remove caracteres não-alfanuméricos, gerando um "ID" inválido como `httpswwwyoutubecomwatchvABC123`. O iframe aponta para uma URL quebrada e o vídeo não carrega.

O mesmo tipo de problema pode ocorrer no Vimeo se o admin colar a URL completa em vez do ID numérico.

## O que fazer

1. Em `src/routes/_authenticated/app/aulas/$lessonId.tsx`, dentro de `VideoEmbed`, extrair o ID real do YouTube a partir de qualquer um destes formatos aceitos:
   - ID puro (`ABC123_-xy`)
   - `https://www.youtube.com/watch?v=ID`
   - `https://youtu.be/ID`
   - `https://www.youtube.com/embed/ID`
   - `https://www.youtube.com/shorts/ID`
   
   Se não for possível extrair um ID válido, mostrar um aviso amigável ("Vídeo indisponível — verifique o link cadastrado") em vez de renderizar um iframe quebrado.

2. Fazer o mesmo para Vimeo: aceitar tanto o ID numérico quanto URLs `https://vimeo.com/123456789` ou `https://player.vimeo.com/video/123456789`.

3. Atualizar o placeholder do campo em `src/routes/_authenticated/admin/cursos/$courseId.tsx` para deixar claro que aceita tanto ID quanto URL completa (ex.: "ID ou URL (YouTube/Vimeo)").

## Fora do escopo
- Não alterar o schema do banco nem a forma de armazenar `video_ref` (continua string livre).
- Não mudar o fluxo de progresso/heurística do YouTube.
