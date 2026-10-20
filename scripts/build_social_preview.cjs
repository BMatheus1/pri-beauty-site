// Render a share card from the site's original brand assets, without changing them.
// Run with Node.js and sharp installed (or available through NODE_PATH).
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const root = path.resolve(__dirname, '..');
const images = path.join(root, 'public/images');
const embed = async name => `data:image/png;base64,${(await sharp(path.join(images, name)).png().toBuffer()).toString('base64')}`;
async function build() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <clipPath id="portrait"><rect x="828" y="91" width="280" height="448" rx="140"/></clipPath>
  </defs>
  <image href="${await embed('hero-gold-desktop.webp')}" width="1200" height="630" preserveAspectRatio="xMidYMid slice"/>
  <rect x="32" y="32" width="1136" height="566" rx="25" fill="none" stroke="#fff9e9" stroke-opacity=".55"/>
  <image href="${await embed('logo-pb-watermark.webp')}" x="150" y="70" width="440" height="248"/>
  <text x="370" y="382" text-anchor="middle" font-family="Georgia,serif" font-size="82" fill="#fffdf7">Pri Beauty</text>
  <text x="370" y="438" text-anchor="middle" font-family="Georgia,serif" font-size="30" fill="#fffdf7">Realçando a sua beleza natural</text>
  <path d="M290 474H450" stroke="#fff9e9" stroke-opacity=".8"/>
  <text x="370" y="516" text-anchor="middle" font-family="Arial,sans-serif" font-size="20" letter-spacing="1" fill="#fffdf7">PROCEDIMENTOS · CATÁLOGO · AGENDAMENTO</text>
  <rect x="820" y="83" width="296" height="464" rx="148" fill="none" stroke="#fff9e9" stroke-opacity=".85"/>
  <image href="${await embed('foto1.jpeg')}" x="828" y="91" width="280" height="448" preserveAspectRatio="xMidYMid slice" clip-path="url(#portrait)"/>
</svg>`;
  const filename = 'compartilhar-pri-beauty-v1.jpg';
  const output = path.join(images, filename);
  await sharp(Buffer.from(svg)).jpeg({ quality: 90, mozjpeg: true }).toFile(output);
  fs.copyFileSync(output, path.join(root, 'dist/images', filename));
  console.log(`${filename}: 1200x630, ${fs.statSync(output).size} bytes`);
}
build().catch(error => { console.error(error); process.exitCode = 1; });
