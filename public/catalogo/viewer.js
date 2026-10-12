const parts = Array.from({ length: 16 }, (_, index) =>
  `./parts/catalogo-${String(index).padStart(2, "0")}.part`
);

const status = document.querySelector("#status");
const message = document.querySelector("#message");
const progress = document.querySelector("#progress");
const viewer = document.querySelector("#viewer");
const catalogAction = document.querySelector("#download");
const prefersExternalViewer =
  window.matchMedia("(max-width: 820px)").matches ||
  /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

let catalogUrl = null;
let retryButton = null;

async function fetchPart(url, attempt = 1) {
  try {
    const response = await fetch(url, { cache: "no-store" });
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

async function loadCatalog() {
  status.hidden = false;
  status.style.display = "grid";
  if (retryButton) retryButton.hidden = true;
  catalogAction.hidden = true;
  progress.parentElement.hidden = false;
  progress.style.width = "0";
  message.textContent = "Carregando o arquivo original com segurança.";

  try {
    const chunks = [];
    const batchSize = 4;
    for (let start = 0; start < parts.length; start += batchSize) {
      const batch = await Promise.all(
        parts.slice(start, start + batchSize).map(fetchPart)
      );
      chunks.push(...batch);
      const loaded = Math.min(start + batch.length, parts.length);
      progress.style.width = Math.round((loaded / parts.length) * 100) + "%";
      message.textContent =
        "Carregando o catálogo… " + loaded + " de " + parts.length;
    }

    if (catalogUrl) URL.revokeObjectURL(catalogUrl);
    catalogUrl = URL.createObjectURL(
      new Blob(chunks, { type: "application/pdf" })
    );

    catalogAction.href = catalogUrl;
    catalogAction.hidden = false;

    if (prefersExternalViewer) {
      catalogAction.textContent = "Abrir PDF";
      catalogAction.removeAttribute("download");
      catalogAction.target = "_blank";
      catalogAction.rel = "noopener";
      status.querySelector("strong").textContent = "Catálogo pronto";
      message.textContent =
        "Toque em “Abrir PDF” para visualizar o catálogo no seu aparelho.";
      progress.parentElement.hidden = true;
    } else {
      viewer.src = catalogUrl;
      viewer.style.display = "block";
      status.hidden = true;
      status.style.display = "none";
    }
  } catch (error) {
    status.querySelector("strong").textContent =
      "Não foi possível carregar o catálogo";
    message.textContent = "Confira sua conexão e tente novamente.";
    progress.parentElement.hidden = true;

    if (!retryButton) {
      retryButton = document.createElement("button");
      retryButton.type = "button";
      retryButton.textContent = "Tentar novamente";
      retryButton.style.cssText =
        "border:1px solid #b28a45;border-radius:999px;padding:10px 18px;background:#b28a45;color:#fff;cursor:pointer";
      retryButton.addEventListener("click", loadCatalog);
      message.insertAdjacentElement("afterend", retryButton);
    }
    retryButton.hidden = false;
    console.error("Falha ao carregar o catálogo:", error);
  }
}

window.addEventListener(
  "beforeunload",
  () => {
    if (catalogUrl) URL.revokeObjectURL(catalogUrl);
  },
  { once: true }
);

loadCatalog();
