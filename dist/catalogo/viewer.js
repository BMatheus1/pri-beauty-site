const parts = Array.from({length: 16}, function(_, i) { return "./parts/catalogo-" + String(i).padStart(2, "0") + ".part"; });
const status = document.querySelector("#status"), message = document.querySelector("#message"), progress = document.querySelector("#progress"), viewer = document.querySelector("#viewer"), download = document.querySelector("#download");
(async function() {
  try {
    const chunks = [];
    for (let i = 0; i < parts.length; i++) {
      const response = await fetch(parts[i]);
      if (!response.ok) throw new Error("Parte " + (i + 1) + " indisponível");
      chunks.push(await response.arrayBuffer());
      progress.style.width = Math.round(((i + 1) / parts.length) * 100) + "%";
      message.textContent = "Carregando o catálogo… " + (i + 1) + " de " + parts.length;
    }
    const url = URL.createObjectURL(new Blob(chunks, { type: "application/pdf" }));
    viewer.src = url; viewer.style.display = "block"; download.href = url; download.hidden = false; status.hidden = true;
    window.addEventListener("beforeunload", function() { URL.revokeObjectURL(url); }, { once: true });
  } catch (error) {
    message.textContent = "Não foi possível abrir o catálogo. Tente recarregar esta página.";
    console.error(error);
  }
})();
