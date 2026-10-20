"""Content, deployment and PDF integrity checks for the complete catalog."""
import hashlib
import json
import re
from html.parser import HTMLParser
from pathlib import Path

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
    assert parser.articles == 24, parser.articles
    assert len(parser.images) == 17, len(parser.images)
    assert len(parser.bookings) == 17, len(parser.bookings)
    for item in parser.images:
        assert item.get('alt'), item
        path = SOURCE / item['data-src']
        assert path.exists(), path
        with Image.open(path) as im:
            assert im.width >= 600, path
    pdf = PdfReader(SOURCE / 'catalogo-pri-beauty.pdf')
    assert len(pdf.pages) == 24
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
    assert digest(SOURCE/'catalogo-original.pdf') == '2ba8e959d689ae061f64898cf1f5df97a341b7194d37b49e7c47bb24c44f757c'
    for file in ['index.html','catalog.css','catalogo-pri-beauty.pdf','catalogo-original.pdf']:
        assert digest(SOURCE/file) == digest(DEPLOY/file), file
    for file in (SOURCE/'images').rglob('*.webp'):
        assert digest(file) == digest(DEPLOY/file.relative_to(SOURCE)), file
    oversized = [str(p) for p in (ROOT/'dist').rglob('*') if p.is_file() and p.stat().st_size > 25*1024*1024]
    assert not oversized, oversized
    print('PASS: 24 pages, 16 services, 17 images, 17 booking links, all prices, AI disclosure, original PDF hash, deployment copies and asset sizes.')


if __name__ == '__main__':
    main()
