const parts = Array.from({ length: 16 }, (_, index) =>
  `./parts/catalogo-${String(index).padStart(2, "0")}.part`
);

const openPdfButton = document.querySelector("#openPdf");
const loadStatus = document.querySelector("#loadStatus");
const loadMessage = document.querySelector("#loadMessage");
const progress = document.querySelector("#progress");
let catalogUrl = null;
let catalogPromise = null;

async function fetchPart(url, attempt = 1) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.arrayBuffer();
  } catch (error) {
    if (attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
      return fetchPart(url, attempt + 1);
    }
    throw error;
  }
}

async function prepareCatalog() {
  if (catalogUrl) return catalogUrl;
  if (catalogPromise) return catalogPromise;

  catalogPromise = (async () => {
    const chunks = [];
    const batchSize = 4;

    for (let start = 0; start < parts.length; start += batchSize) {
      const batch = await Promise.all(parts.slice(start, start + batchSize).map(fetchPart));
      chunks.push(...batch);
      const loaded = Math.min(start + batch.length, parts.length);
      const percent = Math.round((loaded / parts.length) * 100);
      progress.style.width = `${percent}%`;
      loadMessage.textContent = `Preparando o PDF original… ${percent}%`;
    }

    catalogUrl = URL.createObjectURL(new Blob(chunks, { type: "application/pdf" }));
    return catalogUrl;
  })();

  try {
    return await catalogPromise;
  } finally {
    catalogPromise = null;
  }
}

openPdfButton.addEventListener("click", async () => {
  const pdfTab = window.open("", "_blank");

  if (pdfTab) {
    pdfTab.document.title = "Preparando catálogo | Pri Beauty";
    pdfTab.document.body.style.cssText = "margin:0;display:grid;place-items:center;min-height:100vh;background:#f7f1e7;color:#282828;font:16px Arial,sans-serif";
    pdfTab.document.body.textContent = "Preparando o PDF original…";
  }

  openPdfButton.disabled = true;
  loadStatus.hidden = false;
  progress.style.width = "0";
  loadMessage.textContent = "Preparando o PDF original…";

  try {
    const url = await prepareCatalog();
    loadStatus.hidden = true;
    openPdfButton.disabled = false;
    if (pdfTab) {
      pdfTab.opener = null;
      pdfTab.location.replace(url);
    } else {
      window.location.href = url;
    }
  } catch (error) {
    if (pdfTab) pdfTab.close();
    openPdfButton.disabled = false;
    loadStatus.hidden = false;
    progress.style.width = "0";
    loadMessage.textContent = "Não foi possível abrir o PDF. Confira sua conexão e tente novamente.";
    console.error("Falha ao preparar o catálogo:", error);
  }
});

window.addEventListener("beforeunload", () => {
  if (catalogUrl) URL.revokeObjectURL(catalogUrl);
});