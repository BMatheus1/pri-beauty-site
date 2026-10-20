const pages = [...document.querySelectorAll('.book-page')];
const previousButton = document.querySelector('#prev-page');
const nextButton = document.querySelector('#next-page');
const counter = document.querySelector('#page-counter');
const dotsContainer = document.querySelector('#page-dots');
const book = document.querySelector('#book-pages');
let currentPage = 0;
let changing = false;
let touchStartX = 0;

pages.forEach((page, index) => {
  const dot = document.createElement('button');
  dot.type = 'button';
  dot.className = 'page-dot';
  dot.setAttribute('aria-label', index === 0 ? 'Abrir capa' : `Abrir combo ${index}`);
  dot.addEventListener('click', () => showPage(index));
  dotsContainer.append(dot);
});

function updateControls() {
  counter.textContent = `${currentPage + 1} / ${pages.length}`;
  previousButton.disabled = currentPage === 0;
  nextButton.disabled = currentPage === pages.length - 1;
  [...dotsContainer.children].forEach((dot, index) => {
    if (index === currentPage) dot.setAttribute('aria-current', 'page');
    else dot.removeAttribute('aria-current');
  });
}

function showPage(index) {
  if (changing || index === currentPage || index < 0 || index >= pages.length) return;
  changing = true;
  const oldPage = pages[currentPage];
  const newPage = pages[index];
  const movingForward = index > currentPage;

  oldPage.hidden = true;
  oldPage.classList.remove('is-active');
  newPage.hidden = false;
  newPage.classList.add('is-active');
  currentPage = index;
  updateControls();
  changing = false;

  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    newPage.animate(
      [
        { opacity: 0, transform: `rotateY(${movingForward ? '8deg' : '-8deg'}) translateX(${movingForward ? '16px' : '-16px'})` },
        { opacity: 1, transform: 'rotateY(0deg) translateX(0)' }
      ],
      { duration: 280, easing: 'cubic-bezier(.2,.75,.25,1)' }
    );
  }
}

previousButton.addEventListener('click', () => showPage(currentPage - 1));
nextButton.addEventListener('click', () => showPage(currentPage + 1));

document.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft') showPage(currentPage - 1);
  if (event.key === 'ArrowRight') showPage(currentPage + 1);
});

book.addEventListener('touchstart', event => {
  touchStartX = event.changedTouches[0].clientX;
}, { passive: true });

book.addEventListener('touchend', event => {
  const distance = event.changedTouches[0].clientX - touchStartX;
  if (Math.abs(distance) < 45) return;
  showPage(currentPage + (distance < 0 ? 1 : -1));
}, { passive: true });

updateControls();
