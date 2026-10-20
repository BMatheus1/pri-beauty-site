const pages = [...document.querySelectorAll('.book-page')];
const previousButton = document.querySelector('#prev-page');
const nextButton = document.querySelector('#next-page');
const counter = document.querySelector('#page-counter');
const dotsContainer = document.querySelector('#page-dots');
const book = document.querySelector('#book-pages');
let currentPage = 0;
let touchStartX = 0;

pages.forEach((page, index) => {
  page.hidden = false;
  page.style.zIndex = String(pages.length - index);
  const pageCorner = document.createElement('span');
  pageCorner.className = 'page-corner';
  pageCorner.setAttribute('aria-hidden', 'true');
  const pageFold = document.createElement('span');
  pageFold.className = 'page-fold';
  pageFold.setAttribute('aria-hidden', 'true');
  page.append(pageCorner, pageFold);
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
  pages.forEach((page, index) => {
    const isCurrent = index === currentPage;
    page.setAttribute('aria-hidden', String(!isCurrent));
    page.toggleAttribute('inert', !isCurrent);
    page.classList.toggle('is-active', isCurrent);
  });
  [...dotsContainer.children].forEach((dot, index) => {
    if (index === currentPage) dot.setAttribute('aria-current', 'page');
    else dot.removeAttribute('aria-current');
  });
}

function showPage(index) {
  if (index === currentPage || index < 0 || index >= pages.length) return;
  const movingForward = index > currentPage;
  const turningPage = movingForward ? pages[currentPage] : pages[index];

  pages.forEach((page, pageIndex) => {
    page.classList.toggle('is-turned', pageIndex < index);
  });
  turningPage.classList.remove('turn-forward', 'turn-backward');
  turningPage.classList.add(movingForward ? 'turn-forward' : 'turn-backward');
  turningPage.classList.add('is-turning');
  turningPage.addEventListener('transitionend', () => {
    turningPage.classList.remove('is-turning', 'turn-forward', 'turn-backward');
  }, { once: true });

  currentPage = index;
  updateControls();
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

book.addEventListener('click', event => {
  if (event.target.closest('a, button')) return;
  const bounds = book.getBoundingClientRect();
  const clickedRightSide = event.clientX > bounds.left + bounds.width / 2;
  showPage(currentPage + (clickedRightSide ? 1 : -1));
});

updateControls();
