const works = window.PRI_WORKS || [];
const gallery = document.querySelector("#gallery");
const filterButtons = [...document.querySelectorAll(".filter-button")];
const lightbox = document.querySelector("#lightbox");
const lightboxImage = document.querySelector("#lightboxImage");
const lightboxVideo = document.querySelector("#lightboxVideo");
const lightboxCategory = document.querySelector("#lightboxCategory");
const lightboxDescription = document.querySelector("#lightboxDescription");
const galleryToggle = document.querySelector("#galleryToggle");
const galleryToggleLabel = document.querySelector("#galleryToggleLabel");
const collapsedWorkCount = 2;

let visibleWorks = [...works];
let activeCategory = "Todos";
let galleryExpanded = false;
let activeIndex = 0;
let touchStartX = 0;
let lastFocused = null;

function workCategories(work) {
  return work.categories || [work.category];
}

function makeCard(work, index) {
  const isVideo = work.type === "video";
  const button = document.createElement("button");
  button.className = "work-card" + (isVideo ? " work-card-video" : "");
  button.type = "button";
  button.dataset.index = index;
  button.setAttribute(
    "aria-label",
    (isVideo ? "Reproduzir vídeo: " : "Ampliar: ") + work.description
  );

  const mediaBadge = isVideo
    ? '<span class="work-media-type" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m9 7 8 5-8 5V7Z"/></svg>Vídeo</span>'
    : "";

  const actionIcon = isVideo
    ? '<svg viewBox="0 0 24 24"><path d="m9 7 8 5-8 5V7Z"/></svg>'
    : '<svg viewBox="0 0 24 24"><path d="M8 16 16 8M10 8h6v6"/></svg>';
  button.innerHTML =
    '<img src="' + (work.poster || work.src) + '" alt="' + work.alt + '" loading="lazy" decoding="async">' +
    mediaBadge +
    '<span class="work-overlay"><small>' + work.category + "</small><strong>" +
    work.description + '</strong><i aria-hidden="true">' + actionIcon + "</i></span>";
  button.addEventListener("click", () => openLightbox(index, button));
  return button;
}

function updateGalleryToggle(totalWorks) {
  const hiddenCount = Math.max(0, totalWorks - collapsedWorkCount);
  const canExpand = hiddenCount > 0;

  galleryToggle.hidden = !canExpand;
  galleryToggle.setAttribute("aria-expanded", String(galleryExpanded));
  galleryToggleLabel.textContent = galleryExpanded
    ? "Mostrar menos"
    : `Ver mais ${hiddenCount} ${hiddenCount === 1 ? "trabalho" : "trabalhos"}`;
}

function renderGallery(category = activeCategory) {
  activeCategory = category;
  const filteredWorks =
    category === "Todos"
      ? [...works]
      : works.filter((work) => workCategories(work).includes(category));

  visibleWorks = galleryExpanded
    ? filteredWorks
    : filteredWorks.slice(0, collapsedWorkCount);

  gallery.replaceChildren();
  gallery.classList.toggle(
    "is-condensed",
    !galleryExpanded || filteredWorks.length <= collapsedWorkCount
  );
  updateGalleryToggle(filteredWorks.length);

  if (!filteredWorks.length) {
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
    const card = makeCard(work, index);
    card.style.setProperty("--gallery-index", index);
    gallery.append(card);
  });
}

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    filterButtons.forEach((item) => {
      const selected = item === button;
      item.classList.toggle("active", selected);
      item.setAttribute("aria-pressed", String(selected));
    });
    galleryExpanded = false;
    renderGallery(button.dataset.category);
  });
});

galleryToggle.addEventListener("click", () => {
  galleryExpanded = !galleryExpanded;
  renderGallery(activeCategory);
});

function resetVideo() {
  lightboxVideo.pause();
  lightboxVideo.removeAttribute("src");
  lightboxVideo.removeAttribute("poster");
  lightboxVideo.load();
}

function showLightboxMedia(shouldPlay = false) {
  const work = visibleWorks[activeIndex];
  if (!work) return;

  const isVideo = work.type === "video";
  lightboxImage.hidden = isVideo;
  lightboxVideo.hidden = !isVideo;

  if (isVideo) {
    lightboxImage.src = "";
    resetVideo();
    lightboxVideo.src = work.src;
    lightboxVideo.poster = work.poster || "";
    lightboxVideo.setAttribute("aria-label", work.alt);
    lightboxVideo.load();
    if (shouldPlay) lightboxVideo.play().catch(() => {});
  } else {
    resetVideo();
    lightboxImage.src = work.src;
    lightboxImage.alt = work.alt;
  }

  lightboxCategory.textContent = work.category;
  lightboxDescription.textContent = work.description;
}

function openLightbox(index, trigger) {
  activeIndex = index;
  lastFocused = trigger;
  showLightboxMedia(true);
  lightbox.hidden = false;
  document.body.classList.add("modal-open");
  lightbox.querySelector(".lightbox-close").focus();
}

function closeLightbox() {
  lightbox.hidden = true;
  document.body.classList.remove("modal-open");
  lightboxImage.src = "";
  resetVideo();
  lastFocused?.focus();
}

function moveLightbox(step) {
  if (!visibleWorks.length) return;
  activeIndex =
    (activeIndex + step + visibleWorks.length) % visibleWorks.length;
  showLightboxMedia(true);
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
    if (event.target.closest("video, button")) return;
    touchStartX = event.changedTouches[0].screenX;
  },
  { passive: true }
);

lightbox.addEventListener(
  "touchend",
  (event) => {
    if (event.target.closest("video, button")) return;
    const delta = event.changedTouches[0].screenX - touchStartX;
    if (Math.abs(delta) > 45) moveLightbox(delta > 0 ? -1 : 1);
  },
  { passive: true }
);

document.addEventListener("keydown", (event) => {
  if (lightbox.hidden) return;

  if (event.key === "Escape") closeLightbox();
  if (event.target !== lightboxVideo && event.key === "ArrowLeft") moveLightbox(-1);
  if (event.target !== lightboxVideo && event.key === "ArrowRight") moveLightbox(1);

  if (event.key === "Tab") {
    const focusable = [...lightbox.querySelectorAll("button, video[controls]")].filter(
      (element) => !element.hidden
    );
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
