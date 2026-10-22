"""Content, deployment and PDF integrity checks for the complete catalog."""
import hashlib
import json
import re
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from pypdf import PdfReader
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'public/catalogo'
DEPLOY = ROOT / 'dist/catalogo'
DATA = json.loads((ROOT / 'scripts/catalog-content.json').read_text(encoding='utf-8'))


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def normalize(text):
    return re.sub(r'\s+', ' ', text).strip()


class CatalogParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.articles = 0
        self.images = []
        self.bookings = []
        self.text = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'article': self.articles += 1
        if tag == 'img' and 'data-catalog-image' in attrs:
            self.images.append(attrs)
        if tag == 'a' and attrs.get('href', '').startswith('https://wa.me/'):
            self.bookings.append(attrs['href'])

    def handle_data(self, data):
        self.text.append(data)


def main():
    parser = CatalogParser()
    parser.feed((SOURCE / 'index.html').read_text(encoding='utf-8'))
    assert parser.articles == 16, parser.articles
    expected_images = 1 + sum(s.get('showImage', True) for s in DATA['services'])
    assert len(parser.images) == expected_images, len(parser.images)
    html_source = (SOURCE / 'index.html').read_text(encoding='utf-8')
    lash_pages = re.findall(r'<article class="book-page catalog-page catalog-lash-table"[\s\S]*?</article>', html_source)
    assert len(lash_pages) == 1
    assert '<img' not in lash_pages[0] and '<figure' not in lash_pages[0]
    assert 'Nas próximas páginas' not in lash_pages[0]
    assert 'catalog-service-text' not in html_source, 'Individual lash pages must be omitted'
    assert re.findall(r'data-page="(\d+)"', html_source) == [str(i) for i in range(16)]
    assert len(parser.bookings) == 10, len(parser.bookings)
    for item in parser.images:
        assert item.get('alt'), item
        path = SOURCE / item['data-src']
        assert path.exists(), path
        with Image.open(path) as im:
            assert im.width >= 600, path
    pdf = PdfReader(SOURCE / 'catalogo-pri-beauty.pdf')
    assert len(pdf.pages) == 16
    assert not list(pdf.pages[2].images), 'Lash summary must not contain images'
    lash_pdf = normalize(pdf.pages[2].extract_text())
    for service in DATA['services'][:8]:
        assert service['name'] in lash_pdf and service['name'] in lash_pages[0], service['name']
    assert len({(float(p.mediabox.width), float(p.mediabox.height)) for p in pdf.pages}) == 1
    pdf_text = normalize(' '.join(p.extract_text() for p in pdf.pages))
    html_text = normalize(' '.join(parser.text))
    for service in DATA['services']:
        assert normalize(service['name']) in pdf_text, service['name']
        assert normalize(service['name']) in html_text, service['name']
        values = [service['price']] if 'price' in service else [v for _,v in service['prices']]
        if 'maintenance' in service: values.append(service['maintenance'])
        for value in values:
            text = f'R$ {value:.2f}'.replace('.', ',')
            assert text in pdf_text, (service['name'],text)
            assert text in html_text, (service['name'],text)
    assert DATA['aiNotice'] in pdf_text
    assert DATA['aiNotice'] in html_text
    combos = CatalogParser()
    combos_source = (ROOT / 'combos/index.html').read_text(encoding='utf-8')
    combos.feed(combos_source)
    assert combos.articles == 8
    assert '1 / 8' in combos_source
    drainage = re.search(r'<article[^>]+offer-drainage[\s\S]*?</article>', combos_source).group()
    service = next(s for s in DATA['services'] if s['id'] == 'drenagem-linfatica')
    for label, price in service['prices']:
        assert label in drainage and f'R$ {price:.2f}'.replace('.', ',') in drainage
    assert 'sessão adicional de brinde' in drainage
    monthly = re.search(r'<article[^>]+offer-monthly[\s\S]*?</article>', combos_source).group()
    assert '150,00' in monthly and 'Manutenção inclusa o mês todo' in monthly
    assert '1 visita por semana, sem custo adicional' in monthly
    monthly_link = next(url for url in combos.bookings if 'pacote%20mensal' in url)
    message = parse_qs(urlparse(monthly_link).query)['text'][0]
    assert all(text in message for text in ['R$ 150,00', 'uma visita por semana', 'sem custo adicional'])
    for name in ['index.html', 'styles.css', 'script.js']:
        assert digest(ROOT/'combos'/name) == digest(ROOT/'dist/combos'/name)
    assert digest(SOURCE/'catalogo-original.pdf') == '2ba8e959d689ae061f64898cf1f5df97a341b7194d37b49e7c47bb24c44f757c'
    for file in ['index.html','catalog.css','catalogo-pri-beauty.pdf','catalogo-original.pdf']:
        assert digest(SOURCE/file) == digest(DEPLOY/file), file
    for file in (SOURCE/'images').rglob('*.webp'):
        assert digest(file) == digest(DEPLOY/file.relative_to(SOURCE)), file
    oversized = [str(p) for p in (ROOT/'dist').rglob('*') if p.is_file() and p.stat().st_size > 25*1024*1024]
    assert not oversized, oversized
    print(f'PASS: 16 catalog pages, one lash summary without images or duplicate pages, {expected_images} images, all service prices, 8 combo pages, monthly package terms, original PDF hash and deployment copies.')


if __name__ == '__main__':
    main()
