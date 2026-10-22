# Catálogo completo da Pri Beauty

O endereço `/catalogo/` utiliza o mesmo StPageFlip, a mesma capa animada e a mesma folha de estilos do catálogo de combos. Os botões da página inicial continuam apontando para `/catalogo/` e `/combos/` separadamente.

## Conteúdo

- `scripts/catalog-content.json`: nomes, valores, textos, arquivos e textos alternativos.
- A seção de cílios é uma única página “Técnicas e valores”, com as sete técnicas na tabela, os valores de remoção em um bloco compacto e um botão de agendamento. Não há páginas individuais dessas técnicas. Os dados completos permanecem no JSON.
- `showImage: false` omite a fotografia do procedimento tanto no flipbook quanto no PDF.
- `scripts/catalog-image-prompts.json`: prompts efetivamente usados com a ferramenta integrada `image_gen`; 16 fotografias distintas.
- `public/catalogo/images/`: imagens WebP organizadas por categoria. `pri-original.webp` foi extraída do PDF fornecido, sem geração de identidade.
- `public/catalogo/catalog.css`: apresentação das páginas de procedimentos.
- `combos/script.js`: visualizador compartilhado, capa, gestos, seleção de página e carregamento das fotografias próximas.
- `public/catalogo/catalogo-original.pdf`: cópia idêntica do arquivo fornecido. Não é sobrescrita pelo gerador.
- `public/catalogo/catalogo-pri-beauty.pdf`: nova edição, gerada separadamente.

## Atualização

Edite os dados e execute `scripts/build_catalog.py` com Python que tenha Pillow e ReportLab. No ambiente Codex, o executável é retornado por `load_workspace_dependencies`.

O script atualiza o HTML, gera a nova edição PDF em `output/pdf/` e sincroniza os arquivos com `dist/catalogo/`. Use `--html-only` para atualizar o site sem regenerar o PDF. Para atualizar serviços ou preços, execute a geração completa para evitar diferenças entre o site e o download.

O gerador exige apenas as imagens dos procedimentos com `showImage` habilitado. Se houver novos PNGs em `tmp/imagegen/`, ele os converte para WebP de até 1200 pixels. Se não houver PNG, usa o WebP já salvo. As imagens não são geradas novamente durante builds ou visitas.

O catálogo de combos tem oito páginas: capa, cinco combos originais, drenagem linfática com os mesmos preços do catálogo completo e pacote mensal de extensão de cílios por R$ 150,00 (manutenção inclusa o mês todo e uma visita semanal sem custo adicional). Os botões de agendamento usam mensagens específicas. Ao alterar valores da drenagem, mantenha `combos/index.html` alinhado aos dados do catálogo; a validação verifica essa igualdade.

A proporção permanece em 420 × 600. Em desktop há duas folhas; no celular, uma. A capa é importada do catálogo de combos durante a geração. Ao alterar CSS ou JavaScript compartilhado, atualize também os identificadores de versão nos links para invalidar cache.

## Revisão de origem

Foram conferidas as nove páginas de `Catálogo (4).pdf`: sete extensões de cílios, aplicação e manutenção, remoção (R$ 20/R$ 10), quatro serviços de sobrancelhas (R$ 30/R$ 40/R$ 60/R$ 70), limpeza de pele (R$ 120), limpeza com peeling (R$ 180), Spa Labial (R$ 25), apresentação, explicações, formas de pagamento e contatos.

A drenagem e seus preços vieram do texto anexado: R$ 80 por sessão, R$ 360 por cinco e R$ 750 por dez com uma sessão extra. Sirena é uma representação aproximada autorizada na conversa; peeling usa uma cena genérica. Todas as fotos de IA têm identificação, e a nota completa está no catálogo e no PDF.

Referências de características visuais consultadas: [fios 4D em W](https://nagaraku.com/products/nagaraku-4d-w-eyelash-extension), [família de fios Y e W](https://nagaraku.com/collections/yy-w-shape-eyelashes-385). Elas apoiam as ilustrações, sem afirmar o protocolo particular utilizado pela Pri.

## Verificação antes de publicar

Confira todas as páginas em 320, 390 e 1280 pixels; selecione páginas distantes; teste setas, gestos, zoom e agendamento. Renderize e revise as 16 páginas do PDF. Nenhum asset de `dist` pode ultrapassar 25 MiB. Valide que o SHA-256 do PDF original ainda coincide com o arquivo fornecido.

`python scripts/validate_catalog.py` verifica conteúdo, preços, cópias de publicação e integridade dos arquivos. `browser_catalog_qa.js` pode ser incluído com `defer`, depois do visualizador, numa cópia temporária do HTML para testar os limites de todas as páginas e cliques repetidos. O relatório fica em `#qa-result`. Não publique esse HTML de teste.

O catálogo tem 16 páginas após a consolidação da seção de cílios. As nove fotografias restantes continuam com carregamento progressivo. A validação exige uma única página de cílios no HTML e no PDF, sem imagens, mantendo todos os valores originais. As regras de apresentação do peeling usam o identificador do serviço, sem depender do número da página.

A consolidação foi revisada em 320, 390 e 1280 pixels, sem elementos fora dos limites e sem imagens ausentes. As 16 páginas do PDF foram renderizadas para revisão visual; o PDF original mantém o mesmo SHA-256.
