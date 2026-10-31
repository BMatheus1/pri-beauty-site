# Novo vídeo, tipografia e handoff

O arquivo pri_beauty_invitation_opening.mp4 fornecido pelo usuário substituiu a abertura anterior, sem recompressão. Possui 8 s, resolução 768 × 1366, 24 fps, H.264 e áudio AAC. Lora foi aplicada às informações; Cormorant Garamond permanece nas marcas/títulos e Montserrat nos controles. Os emojis foram removidos, preservando os dados do evento e o ampersand.

Não foram instaladas dependências. O projeto existente é HTML/CSS/JavaScript estático com GSAP; não havia Next.js, React, TypeScript ou ESLint configurados.

## Quadro real e geometria

FFmpeg extraiu o primeiro quadro para opening-poster.webp e o quadro 186, em 7,75 s, para handoff-frame.png. O trecho final mostra uma área de papel em branco praticamente estável; não se afirma que o vídeo contém a retirada completa do cartão.

handoff-config.js registra os parâmetros manuais ajustáveis obtidos desse frame: limite superior y≈513, largura visível de 768 px e abertura frontal poligonal (0,739), (201,922), (531,922), (768,698). As laterais da folha estão cortadas pelo enquadramento. renderedVideoBox considera resolução intrínseca, retângulo exibido e object-contain/object-cover.

handoff-card-top.webp é um recorte real com alpha que exclui as faces do envelope. No início da continuidade, o mesmo artigo HTML recebe essa aparência de papel, alinhada por matriz projetiva de quatro cantos e ocultada pelo contorno da frente do envelope. A escrita já pertence ao artigo, mas é revelada de forma sutil após o início da subida, preservando a aparência branca do vídeo. A integração de material ocorre no mesmo plano; não é um fade entre duas cenas. Depois da extração inicial, a folha se expande até a leitura e retorna ao fluxo normal sem trocar o nó HTML.

## Sincronização

A preparação oculta começa em 7,15 s. requestVideoFrameCallback acompanha mediaTime; quando o quadro atinge ou ultrapassa 7,75 s, o vídeo é pausado e a continuação dispara uma única vez. Sem essa API, timeupdate consulta currentTime. O timer é apenas proteção contra conexão paralisada, não controla o handoff normal.

Estados: closed, video-playing, handoff-preparing, handoff, card-extracting, card-expanding e opened. Replay restaura vídeo, máscaras e transformações. Reprodução bloqueada, vídeo ausente, opção de pular, movimento reduzido e ausência de GSAP possuem fallback. Callbacks de vídeo, timers e tween são liberados ao sair.

## Validação executada

Testes de reprodução real e continuidade passaram em 320×568, 375×667, 390×844, 430×932, 768×1024 e 1440×900. Foram verificados o mesmo artigo HTML, fonte Lora, ausência dos emojis, replay, execução única, continuidade final inferior a 1 px, opção de pular, vídeo bloqueado/ausente, movimento reduzido e ausência de GSAP.

O teste específico confirmou que pausar a mídia antes do ponto de transferência impede o avanço pelo relógio. Registrou handoff em 7,791667 s, uma execução, redimensionamento durante a extração e funcionamento sem requestVideoFrameCallback. Na região interior de papel amostrada, a diferença média de RGB entre o vídeo e o handoff foi 1,439/255; isso não comprova identidade pixel a pixel de toda a cena. Capturas e relatório: output/convite/handoff/.

A sintaxe dos módulos e o build estático foram verificados. Não se declara TypeScript/lint como executados, pois não há configuração desses checks.

## Comandos

- node scripts/preview_invite.cjs
- node scripts/build_invite.cjs
- node scripts/test_invite.cjs
- node scripts/test_video_handoff.cjs
- node scripts/check_invite_history.cjs
- node scripts/check_invite_nojs.cjs

Playwright/Sharp usam os caminhos do runtime desta máquina; ajustar os requires em outro ambiente. Publicar dist/ na Cloudflare Pages ou usar o processo do Worker existente. Não houve deploy.

## Limites

A calibração é manual e específica deste vídeo. Uma troca de corte/câmera exige revisar a configuração e os recortes. Como o vídeo não mostra a folha inteira, a continuação longa e a tipografia são HTML. Não se garante imperceptibilidade em todo dispositivo sem avaliação visual adicional.
