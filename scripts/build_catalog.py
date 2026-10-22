"""Build the complete Pri Beauty catalog from reviewed content and generated assets.

Run with bundled Python: scripts/build_catalog.py [--html-only]
The original PDF is read-only. The new PDF is a separate deliverable.
"""
import argparse
import html
import json
import re
import shutil
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / 'public' / 'catalogo'
DATA = json.loads((ROOT / 'scripts/catalog-content.json').read_text(encoding='utf-8'))
SERVICES = {item['id']: item for item in DATA['services']}


def money(value):
    return f'R$ {value:,.2f}'.replace(',', '_').replace('.', ',').replace('_', '.')


def escape(value):
    return html.escape(str(value), quote=True)


def booking(name):
    message = f'Olá, Pri! Vi {name} no catálogo completo e gostaria de agendar um horário.'
    return f'https://wa.me/{DATA["whatsapp"]}?text={quote(message)}'


def page_specs():
    specs = [
        {'kind': 'cover', 'name': 'Capa'},
        {'kind': 'lash-table', 'name': 'Extensão de cílios: valores'}
    ]
    specs.append({'kind': 'text', 'name': 'Design de sobrancelhas', 'eyebrow': 'Beleza em cada detalhe', 'paragraphs': DATA['browIntro']})
    specs.extend({'kind': 'service', 'name': s['name'], 'service': s} for s in DATA['services'][8:12])
    specs.extend([
        {'kind': 'text', 'name': 'O que é Brow Lamination?', 'eyebrow': 'Conheça o procedimento', 'paragraphs': DATA['browInfo']},
        {'kind': 'text', 'name': 'Limpeza de pele e Spa Labial', 'eyebrow': 'Um momento para você', 'paragraphs': DATA['facialIntro']}
    ])
    specs.extend({'kind': 'service', 'name': s['name'], 'service': s} for s in DATA['services'][12:])
    specs.extend([
        {'kind': 'notice', 'name': 'Sobre as imagens do catálogo'},
        {'kind': 'contact', 'name': 'Agendamento e pagamento'}
    ])
    assert len(specs) == 15
    return specs


def prices_html(service):
    if 'maintenance' in service:
        return '<div class="catalog-prices">' + ''.join(
            f'<div><span>{label}</span><strong>{money(value)}</strong></div>'
            for label, value in [('Aplicação', service['price']), ('Manutenção', service['maintenance'])]
        ) + '</div>'
    if 'prices' in service:
        return '<div class="catalog-price-list">' + ''.join(
            f'<div><span>{escape(label)}</span><strong>{money(value)}</strong></div>' for label, value in service['prices']
        ) + '</div>'
    return f'<div class="catalog-price-single"><span>Investimento</span><strong>{money(service["price"])}</strong></div>'


def build_html(specs):
    template = (ROOT / 'combos/index.html').read_text(encoding='utf-8')
    cover = re.search(r'<article class="book-page cover"[\s\S]*?</article>', template).group()
    cover = cover.replace('Combos<br><em>promocionais</em>', 'Catálogo<br><em>completo</em>')
    cover = cover.replace('Experiências pensadas para realçar a sua beleza natural.', 'Beleza que transforma,<br>elegância que encanta.')
    rendered = [cover]
    for number, spec in enumerate(specs[1:], 1):
        kind, name = spec['kind'], spec['name']
        heading = f'<p class="catalog-eyebrow">{escape(spec.get("eyebrow", "Pri Beauty"))}</p><h2>{escape(name)}</h2>'
        bottom = '<p class="catalog-page-brand">Pri Beauty</p>'
        if kind == 'service':
            service = spec['service']
            heading = f'<p class="catalog-eyebrow">{escape(service["category"])}</p><h2>{escape(name)}</h2>'
            photo = (f'<figure class="catalog-photo"><img data-catalog-image data-src="./images/{service["image"]}" width="960" height="640" alt="{escape(service["alt"])}" decoding="async"><figcaption>Imagem ilustrativa de IA</figcaption></figure>'
                     if service.get('showImage', True) else '<div class="catalog-divider" aria-hidden="true"></div>')
            body = f'''{heading}
              {photo}
              <p class="catalog-description">{escape(service['description'])}</p>
              {prices_html(service)}
              {('<p class="catalog-note">' + escape(service['note']) + '</p>') if service.get('note') else ''}
              {('<p class="catalog-note">' + escape(service['imageNote']) + '</p>') if service.get('imageNote') else ''}
              <a class="book-cta catalog-booking" href="{booking(name)}" target="_blank" rel="noopener">Quero agendar</a>{bottom}'''
        elif kind == 'about':
            body = f'''{heading}<img class="catalog-portrait" data-catalog-image data-src="./images/pri-original.webp" width="615" height="922" alt="Fotografia original da Priscila, preservada do PDF" decoding="async">
              <div class="catalog-paragraphs">{''.join(f'<p>{escape(p)}</p>' for p in spec['paragraphs'])}</div>{bottom}'''
        elif kind == 'lash-table':
            rows = ''.join(f'<tr><th scope="row">{escape(s["name"])}</th><td>{money(s["price"])}</td><td>{money(s["maintenance"])}</td></tr>' for s in DATA['services'][:7])
            removal = SERVICES['remocao-cilios']
            body = f'''<p class="catalog-eyebrow">Técnicas e valores</p><h2>Extensão de cílios</h2>
              <table class="catalog-table"><thead><tr><th scope="col">Técnica</th><th scope="col">Aplicação</th><th scope="col">Manutenção</th></tr></thead><tbody>{rows}</tbody></table>
              <aside class="catalog-removal" aria-label="Valores da remoção de cílios"><strong>Remoção de cílios</strong><span>De outro(a) profissional: {money(removal['prices'][0][1])}</span><span>Do meu procedimento: {money(removal['prices'][1][1])}</span></aside>
              <a class="book-cta catalog-booking" href="{booking('Extensão de cílios')}" target="_blank" rel="noopener">Agendar cílios</a>{bottom}'''
        elif kind == 'text':
            body = f'{heading}<div class="catalog-divider" aria-hidden="true"></div><div class="catalog-paragraphs">' + ''.join(f'<p>{escape(p)}</p>' for p in spec['paragraphs']) + f'</div>{bottom}'
        elif kind == 'notice':
            body = f'''<p class="catalog-eyebrow">Transparência e cuidado</p><h2>{escape(name)}</h2><div class="catalog-divider" aria-hidden="true"></div>
              <div class="catalog-paragraphs"><p>{escape(DATA['aiNotice'])}</p>
              <p>As imagens representam os procedimentos de forma aproximada. Não são registros de atendimentos ou resultados de clientes da Pri Beauty.</p>
              <p>A cena de peeling é genérica.</p></div>{bottom}'''
        else:
            body = f'''<img class="contact-logo" src="../images/logo-pb-watermark.webp" width="1296" height="730" alt="Logo Pri Beauty">
              <p class="catalog-eyebrow">Será um prazer receber você</p><h2>Seu momento de cuidado</h2>
              <p class="payment-label">Formas de pagamento</p><ul class="payment-list">{''.join(f'<li>{escape(p)}</li>' for p in DATA['payments'])}</ul>
              <p class="contact-phone">{escape(DATA['phone'])}</p><a class="contact-instagram" href="https://www.instagram.com/{DATA['instagram']}/" target="_blank" rel="noopener">@{escape(DATA['instagram'])}</a>
              <a class="book-cta catalog-booking" href="{booking('o catálogo completo')}" target="_blank" rel="noopener">Agendar pelo WhatsApp</a>{bottom}'''
        hard = ' data-density="hard"' if number == len(specs) - 1 else ''
        text_class = ' catalog-service-text' if kind == 'service' and not spec['service'].get('showImage', True) else ''
        service_attr = f' data-service="{escape(spec["service"]["id"])}"' if kind == 'service' else ''
        rendered.append(f'<article class="book-page catalog-page catalog-{kind}{text_class}" data-page="{number}"{service_attr}{hard} aria-label="{escape(name)}"><div class="catalog-page-inner"><span class="catalog-folio">{number:02d}</span>{body}</div></article>')
    output = re.sub(r'<article class="book-page cover"[\s\S]*?</article>[\s\S]*?(?=\s*</div>\s*<div class="viewer-loading")', '\n'.join(rendered), template, count=1)
    output = output.replace('Combos promocionais | Pri Beauty', 'Catálogo completo | Pri Beauty')
    output = output.replace('Conheça os combos promocionais da Pri Beauty.', 'Conheça todos os procedimentos, técnicas e valores da Pri Beauty.')
    output = output.replace('<small>Combos promocionais</small>', '<small>Catálogo completo</small>')
    output = output.replace('Seleções especiais', 'Procedimentos e valores')
    output = output.replace('Deslize ou use as setas para conhecer cada combo.', 'Folheie o catálogo e encontre o cuidado ideal para você.')
    output = output.replace('aria-label="Catálogo de combos promocionais"', 'aria-label="Catálogo completo de procedimentos"')
    output = re.sub(r'<span id="page-counter">1 / \d+</span>', f'<span id="page-counter">1 / {len(specs)}</span>', output)
    output = output.replace('<div class="page-dots" id="page-dots" aria-label="Escolher página"></div>', '<div class="page-dots" id="page-dots" hidden></div><label class="catalog-select-label" for="page-select">Ir para a página</label><select id="page-select" class="catalog-page-select" aria-label="Ir para a página do catálogo"></select>')
    output = output.replace('Valores promocionais sujeitos à disponibilidade de agenda.', escape(DATA['aiNotice']))
    output = output.replace('<body>', '<body class="catalog-complete">')
    output = re.sub(r'href="\./styles\.css\?v=[^"]+"', 'href="../combos/styles.css?v=20261021-offers-1"', output)
    output = output.replace('</head>', '  <link rel="stylesheet" href="./catalog.css?v=20261021-summary-1">\n</head>')
    output = output.replace('./vendor/page-flip.browser.js', '../combos/vendor/page-flip.browser.js')
    output = re.sub(r'src="\./script\.js\?v=[^"]+"', 'src="../combos/script.js?v=20261021-last-page-1"', output)
    output = output.replace('  </main>', '''    <nav class="catalog-downloads" aria-label="Arquivos do catálogo"><a href="./catalogo-pri-beauty.pdf" download>Baixar este catálogo em PDF</a><a href="./catalogo-original.pdf" target="_blank" rel="noopener">Ver PDF original</a><a href="../combos/">Ver combos promocionais</a></nav>\n  </main>''')
    output = '\n'.join(line.rstrip() for line in output.splitlines()) + '\n'
    (PUBLIC / 'index.html').write_text(output, encoding='utf-8')


def optimize_assets():
    from PIL import Image
    for service in DATA['services']:
        if not service.get('showImage', True):
            continue
        raw = ROOT / 'tmp/imagegen' / f'{service["id"]}.png'
        target = PUBLIC / 'images' / service['image']
        if not raw.exists() and not target.exists():
            raise FileNotFoundError(f'Missing generated image: {service["id"]}')
        if raw.exists() and (not target.exists() or raw.stat().st_mtime > target.stat().st_mtime):
            target.parent.mkdir(parents=True, exist_ok=True)
            image = Image.open(raw).convert('RGB')
            image.thumbnail((1200, 800), Image.Resampling.LANCZOS)
            image.save(target, format='WEBP', quality=88, method=6)


def build_pdf(specs):
    from reportlab.pdfgen import canvas
    from reportlab.lib.colors import HexColor, Color
    from reportlab.lib.enums import TA_CENTER, TA_LEFT
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.platypus import Paragraph
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from reportlab.lib.utils import ImageReader

    pdfmetrics.registerFont(TTFont('CatalogBody', 'C:/Windows/Fonts/arial.ttf'))
    pdfmetrics.registerFont(TTFont('CatalogBold', 'C:/Windows/Fonts/arialbd.ttf'))
    pdfmetrics.registerFont(TTFont('CatalogTitle', 'C:/Windows/Fonts/georgia.ttf'))
    pdfmetrics.registerFontFamily('CatalogBody', normal='CatalogBody', bold='CatalogBold', italic='CatalogBody', boldItalic='CatalogBold')
    output = ROOT / 'output/pdf/catalogo-pri-beauty.pdf'
    output.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(output), pagesize=(420, 600), pageCompression=1)
    c.setTitle('Catálogo completo | Pri Beauty')
    c.setAuthor('Pri Beauty')
    c.setSubject(DATA['aiNotice'])
    gold, ink = HexColor('#8b641d'), HexColor('#28231d')

    def paragraph(text, y, size=12, font='CatalogBody', color=ink, width=336, align=TA_LEFT, gap=10):
        style = ParagraphStyle('catalog', fontName=font, fontSize=size, leading=size*1.32, textColor=color, alignment=align)
        p = Paragraph(text, style)
        _, height = p.wrap(width, 600)
        p.drawOn(c, (420-width)/2, y-height)
        return y-height-gap

    def title(name, eyebrow='Pri Beauty'):
        y = paragraph(escape(eyebrow).upper(), 548, 8, 'CatalogBold', gold, align=TA_CENTER, gap=12)
        return paragraph(escape(name), y, 26, 'CatalogTitle', ink, align=TA_CENTER, gap=20)

    def draw_photo(path, y, height=155, contain=False):
        from PIL import Image, ImageOps
        im = Image.open(path).convert('RGBA' if contain else 'RGB')
        if contain:
            c.drawImage(ImageReader(im), 42, y-height, width=336, height=height, preserveAspectRatio=True, anchor='c', mask='auto')
        else:
            from io import BytesIO
            im = ImageOps.fit(im, (1008, int(height*3)), method=Image.Resampling.LANCZOS)
            compressed = BytesIO()
            im.save(compressed, format='JPEG', quality=91, optimize=True)
            compressed.seek(0)
            c.drawImage(ImageReader(compressed), 42, y-height, width=336, height=height)
        return y-height-9

    for number, spec in enumerate(specs):
        kind = spec['kind']
        c.setFillColor(HexColor('#c7a151' if kind == 'cover' else '#fffaf1'))
        c.rect(0, 0, 420, 600, fill=1, stroke=0)
        c.setStrokeColor(HexColor('#f9edc9' if kind == 'cover' else '#d7bd87'))
        c.setLineWidth(.7)
        c.rect(14, 14, 392, 572, fill=0, stroke=1)
        c.setFillColor(gold)
        c.setFont('CatalogBody', 8)
        c.drawRightString(378, 568, f'{number+1:02d}')

        if kind == 'cover':
            c.drawImage(str(ROOT/'public/images/logo-pb-watermark.webp'), 62, 320, width=296, height=168, mask='auto')
            y = paragraph('Pri Beauty', 332, 30, 'CatalogTitle', HexColor('#ffffff'), align=TA_CENTER, gap=35)
            y = paragraph('Catálogo completo', y, 39, 'CatalogTitle', HexColor('#ffffff'), align=TA_CENTER, gap=22)
            paragraph('Beleza que transforma,<br/>elegância que encanta.', y, 16, 'CatalogTitle', HexColor('#ffffff'), align=TA_CENTER)
        elif kind == 'service':
            s = spec['service']
            y = title(s['name'], s['category'])
            illustrated = s.get('showImage', True)
            if illustrated:
                y = draw_photo(PUBLIC/'images'/s['image'], y, 145)
                y = paragraph('Imagem ilustrativa de IA', y, 7, color=gold, align=TA_CENTER, gap=12)
            else:
                c.setStrokeColor(HexColor('#ceb478'))
                c.line(170, 443, 250, 443)
                y = 410
            y = paragraph(escape(s['description']), y, 10.8 if illustrated else 13, align=TA_LEFT if illustrated else TA_CENTER, gap=13)
            rows = [('Aplicação',s['price']),('Manutenção',s['maintenance'])] if 'maintenance' in s else s.get('prices', [('Investimento',s.get('price'))])
            if 'maintenance' in s:
                if not illustrated:
                    c.setFillColor(HexColor('#f7eddc'))
                    c.setStrokeColor(HexColor('#ddc79d'))
                    c.roundRect(42, 175, 336, 92, 9, fill=1, stroke=1)
                for x, (label, value) in zip([126,294], rows):
                    c.setFillColor(gold)
                    c.setFont('CatalogBody',8)
                    c.drawCentredString(x,228 if not illustrated else 147,label.upper())
                    c.setFont('CatalogTitle',24)
                    c.drawCentredString(x,200 if not illustrated else 119,money(value))
                y=105
            elif 'prices' not in s:
                c.setFillColor(gold)
                c.setFont('CatalogBody',8)
                c.drawCentredString(210,147,'INVESTIMENTO')
                c.setFont('CatalogTitle',30)
                c.drawCentredString(210,114,money(s['price']))
                y=103
            else:
                y=min(y,174)
                for label, value in rows:
                    y = paragraph(f'{escape(label)}: <b>{money(value)}</b>', y, 13, color=gold, align=TA_CENTER, gap=5)
            if s.get('note'): y = paragraph(escape(s['note']), y-3, 8.5, color=gold, align=TA_CENTER)
            if s.get('imageNote'): paragraph(escape(s['imageNote']), y-3, 8, color=gold, align=TA_CENTER)
            c.linkURL(booking(s['name']), (92, 35, 328, 64), relative=0)
            c.setFillColor(gold)
            c.roundRect(92, 35, 236, 29, 14, fill=1, stroke=0)
            c.setFillColor(HexColor('#ffffff'))
            c.setFont('CatalogBold', 9)
            c.drawCentredString(210, 46, 'QUERO AGENDAR')
        elif kind == 'about':
            y = title(spec['name'])
            y = draw_photo(PUBLIC/'images/pri-original.webp', y, 165, contain=True)
            for text in spec['paragraphs']: y = paragraph(escape(text), y-5, 11.3)
        elif kind == 'lash-table':
            y = title('Extensão de cílios', 'Técnicas e valores')
            c.setFont('CatalogBold', 10)
            for x, text in [(42,'Técnica'),(238,'Aplicação'),(313,'Manutenção')]: c.drawString(x,y,text)
            y -= 36
            for s in DATA['services'][:7]:
                c.setFont('CatalogBody',10)
                c.drawString(42,y,s['name'])
                c.drawString(238,y,money(s['price']))
                c.drawString(313,y,money(s['maintenance']))
                c.setStrokeColor(HexColor('#e3d3b1'))
                c.line(42,y-12,378,y-12)
                y -= 42
            removal = SERVICES['remocao-cilios']
            y = paragraph('Remoção de cílios', y-5, 12, 'CatalogTitle', gold, align=TA_CENTER, gap=5)
            for label, value in removal['prices']:
                y = paragraph(f'{escape(label)}: <b>{money(value)}</b>', y, 9, color=gold, align=TA_CENTER, gap=4)
            c.linkURL(booking('Extensão de cílios'), (92, 35, 328, 64), relative=0)
            c.setFillColor(gold)
            c.roundRect(92, 35, 236, 29, 14, fill=1, stroke=0)
            c.setFillColor(HexColor('#ffffff'))
            c.setFont('CatalogBold', 9)
            c.drawCentredString(210, 46, 'AGENDAR CÍLIOS')
        elif kind == 'text':
            y = title(spec['name'], spec['eyebrow'])
            for text in spec['paragraphs']: y = paragraph(escape(text), y, 12)
        elif kind == 'notice':
            y = title(spec['name'], 'Transparência e cuidado')
            for text in [DATA['aiNotice'], 'As imagens são representações aproximadas dos procedimentos. Não são registros de atendimentos ou resultados de clientes da Pri Beauty.', 'A cena de peeling é genérica.', 'O formato dos olhos, as características dos fios e o tipo de pele são considerados na escolha do procedimento no atendimento.']:
                y = paragraph(escape(text),y,12)
        else:
            y = title('Seu momento de cuidado', 'Será um prazer receber você')
            y = paragraph('Formas de pagamento',y,18,'CatalogTitle',gold,align=TA_CENTER)
            for text in DATA['payments']: y = paragraph(text,y,13,align=TA_CENTER)
            y = paragraph(DATA['phone'],y-20,21,'CatalogTitle',gold,align=TA_CENTER)
            paragraph('@'+DATA['instagram'],y,15,align=TA_CENTER)
            c.linkURL(booking('o catálogo completo'), (42,80,378,500),relative=0)
        c.setFillColor(gold)
        c.setFont('CatalogTitle',9)
        c.drawCentredString(210,23,'Pri Beauty')
        c.showPage()
    c.save()
    shutil.copy2(output, PUBLIC/'catalogo-pri-beauty.pdf')
    return output


def sync_deploy():
    destination = ROOT/'dist/catalogo'
    destination.mkdir(parents=True, exist_ok=True)
    for name in ['index.html', 'catalog.css', 'catalogo-pri-beauty.pdf', 'catalogo-original.pdf']:
        if (PUBLIC/name).exists(): shutil.copy2(PUBLIC/name,destination/name)
    shutil.copytree(PUBLIC/'images', destination/'images', dirs_exist_ok=True)
    for name in ['index.html','script.js','styles.css']:
        shutil.copy2(ROOT/'combos'/name, ROOT/'dist/combos'/name)


if __name__ == '__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--html-only',action='store_true')
    args=parser.parse_args()
    specs=page_specs()
    build_html(specs)
    if not args.html_only:
        optimize_assets()
        print('PDF:', build_pdf(specs))
    sync_deploy()
    print('Catalog pages:',len(specs))
