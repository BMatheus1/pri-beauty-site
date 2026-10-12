const works = window.PRI_WORKS || [];
const gallery = document.querySelector("#gallery");
const filterButtons = [...document.querySelectorAll(".filter-button")];
const lightbox = document.querySelector("#lightbox");
const lightboxImage = document.querySelector("#lightboxImage");
const lightboxCategory = document.querySelector("#lightboxCategory");
const lightboxDescription = document.querySelector("#lightboxDescription");

let visibleWorks = [...works];
let activeIndex = 0;
let touchStartX = 0;
let lastFocused = null;

function makeCard(work, index) {
  const button = document.createElement("button");
  button.className = "work-card";
  button.type = "button";
  button.dataset.index = index;
  button.setAttribute("aria-label", "Ampliar: " + work.description);
  button.innerHTML =
    '<img src="' + work.src + '" alt="' + work.alt + '" loading="lazy" decoding="async">' +
    '<span class="work-overlay"><small>' + work.category + "</small><strong>" +
    work.description + '</strong><i aria-hidden="true">↗</i></span>';
  button.addEventListener("click", () => openLightbox(index, button));
  return button;
}

function renderGallery(category = "Todos") {
  visibleWorks =
    category === "Todos"
      ? [...works]
      : works.filter((work) => work.category === category);

  gallery.replaceChildren();

  if (!visibleWorks.length) {
    const empty = document.createElement("div");
    empty.className = "empty-gallery";
    empty.innerHTML =
      '<span aria-hidden="true">✦</span>' +
      "<strong>Novos trabalhos em breve</strong>" +
      "<p>As fotos autorizadas desta categoria serão adicionadas aqui.</p>";
    gallery.append(empty);
    return;
  }

  visibleWorks.forEach((work, index) => {
    gallery.append(makeCard(work, index));
  });
}

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    filterButtons.forEach((item) => {
      const selected = item === button;
      item.classList.toggle("active", selected);
      item.setAttribute("aria-pressed", String(selected));
    });
    renderGallery(button.dataset.category);
  });
});

function showLightboxImage() {
  const work = visibleWorks[activeIndex];
  if (!work) return;
  lightboxImage.src = work.src;
  lightboxImage.alt = work.alt;
  lightboxCategory.textContent = work.category;
  lightboxDescription.textContent = work.description;
}

function openLightbox(index, trigger) {
  activeIndex = index;
  lastFocused = trigger;
  showLightboxImage();
  lightbox.hidden = false;
  document.body.classList.add("modal-open");
  lightbox.querySelector(".lightbox-close").focus();
}

function closeLightbox() {
  lightbox.hidden = true;
  document.body.classList.remove("modal-open");
  lightboxImage.src = "";
  lastFocused?.focus();
}

function moveLightbox(step) {
  if (!visibleWorks.length) return;
  activeIndex =
    (activeIndex + step + visibleWorks.length) % visibleWorks.length;
  showLightboxImage();
}

lightbox
  .querySelector(".lightbox-close")
  .addEventListener("click", closeLightbox);
lightbox
  .querySelector(".lightbox-prev")
  .addEventListener("click", () => moveLightbox(-1));
lightbox
  .querySelector(".lightbox-next")
  .addEventListener("click", () => moveLightbox(1));

lightbox.addEventListener("click", (event) => {
  if (event.target === lightbox) closeLightbox();
});

lightbox.addEventListener(
  "touchstart",
  (event) => {
    touchStartX = event.changedTouches[0].screenX;
  },
  { passive: true }
);

lightbox.addEventListener(
  "touchend",
  (event) => {
    const delta = event.changedTouches[0].screenX - touchStartX;
    if (Math.abs(delta) > 45) moveLightbox(delta > 0 ? -1 : 1);
  },
  { passive: true }
);

document.addEventListener("keydown", (event) => {
  if (lightbox.hidden) return;

  if (event.key === "Escape") closeLightbox();
  if (event.key === "ArrowLeft") moveLightbox(-1);
  if (event.key === "ArrowRight") moveLightbox(1);

  if (event.key === "Tab") {
    const focusable = [...lightbox.querySelectorAll("button")];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    }

    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
});

renderGallery();
const floatingWhatsapp = document.querySelector(".floating-whatsapp");
const primaryWhatsapp = document.querySelector(".quick-link-primary");

if (floatingWhatsapp && primaryWhatsapp) {
  const setFloatingVisibility = (isPrimaryVisible) => {
    floatingWhatsapp.classList.toggle("is-hidden", isPrimaryVisible);
  };

  const primaryRect = primaryWhatsapp.getBoundingClientRect();
  setFloatingVisibility(primaryRect.top < window.innerHeight && primaryRect.bottom > 0);

  if ("IntersectionObserver" in window) {
    const floatingObserver = new IntersectionObserver(
      ([entry]) => setFloatingVisibility(entry.isIntersecting),
      { threshold: 0.2 }
    );
    floatingObserver.observe(primaryWhatsapp);
  }
}
