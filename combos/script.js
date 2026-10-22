const flipbookConfig = Object.freeze({
  animationDuration: 800,
  enableShadows: true,
  shadowIntensity: 0.35,
  enableDrag: true,
  enableTouch: true,
  showCover: true,
  autoResponsive: true,
  enableZoom: true,
  enableKeyboard: true,
  reducedMotionSupport: true
});

const viewerPanel = document.querySelector('#viewer-panel');
const bookStage = document.querySelector('#book-stage');
const bookElement = document.querySelector('#book-pages');
const pages = [...document.querySelectorAll('.book-page')];
const previousButton = document.querySelector('#prev-page');
const nextButton = document.querySelector('#next-page');
const counter = document.querySelector('#page-counter');
const dotsContainer = document.querySelector('#page-dots');
const zoomOutButton = document.querySelector('#zoom-out');
const zoomInButton = document.querySelector('#zoom-in');
const fitButton = document.querySelector('#fit-book');
const fullscreenButton = document.querySelector('#fullscreen-book');
const errorMessage = document.querySelector('#viewer-error');
const pageSelect = document.querySelector('#page-select');
const imageLoads = new Map();

function preloadNearbyPages(index) {
  const tasks = [];
  pages.slice(Math.max(0, index - 2), index + 4).forEach(page => {
    page.querySelectorAll('img[data-catalog-image]').forEach(image => {
      if (image.dataset.src && !imageLoads.has(image)) {
        image.src = image.dataset.src;
        image.removeAttribute('data-src');
        imageLoads.set(image, image.decode().catch(() => {}));
      }
      if (imageLoads.has(image)) tasks.push(imageLoads.get(image));
    });
  });
  return Promise.all(tasks);
}

let pageFlip = null;
let viewerState = 'loading';
let currentPage = 0;
let zoomLevel = 1;
let resizeFrame = 0;
let lastViewerWidth = 0;
let navigationLocked = false;
let navigationUnlockTimer = 0;

const reducedMotion = flipbookConfig.reducedMotionSupport &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const coverSignature = document.querySelector('.cover-signature');
const signatureGuide = document.querySelector('.signature-guide');
const signatureWings = document.querySelector('.signature-wings');
const signatureStrokes = [...document.querySelectorAll('[data-pen]')].map(path => ({
  path,
  length: path.getTotalLength()
}));
let signatureFrame = 0;

function finishCoverSignature() {
  cancelAnimationFrame(signatureFrame);
  signatureFrame = 0;
  coverSignature.classList.remove('is-writing');
}

function animateCoverSignature() {
  finishCoverSignature();
  if (reducedMotion || document.hidden) return;
  signatureStrokes.forEach(({ path, length }) => {
    path.style.strokeDasharray = `${length} ${length}`;
    path.style.strokeDashoffset = String(length);
  });
  coverSignature.classList.add('is-writing');
  const duration = 4800;
  const totalLength = signatureStrokes.reduce((sum, stroke) => sum + stroke.length, 0);
  let started = null;

  function draw(now) {
    if (started === null) started = now;
    const progress = Math.min((now - started) / duration, 1);
    let remaining = progress * totalLength;
    let activeStroke = signatureStrokes[0];
    let activeDistance = 0;
    signatureStrokes.forEach(stroke => {
      const distance = Math.min(Math.max(remaining, 0), stroke.length);
      stroke.path.style.strokeDashoffset = String(stroke.length - distance);
      if (remaining >= 0) {
        activeStroke = stroke;
        activeDistance = distance;
      }
      remaining -= stroke.length;
    });
    const point = activeStroke.path.getPointAtLength(activeDistance);
    const flutter = .75 + .25 * Math.sin((now - started) / 65);
    signatureGuide.setAttribute('transform', `translate(${point.x} ${point.y - 15}) rotate(${Math.sin(progress * 20) * 12})`);
    signatureWings.setAttribute('transform', `scale(${.27 * flutter} .27) translate(-1135 -385)`);
    if (progress < 1) signatureFrame = requestAnimationFrame(draw);
    else finishCoverSignature();
  }

  signatureFrame = requestAnimationFrame(draw);
}

pages.forEach((page, index) => {
  if (pageSelect) {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = `${index + 1}. ${page.getAttribute('aria-label') || 'Página'}`;
    pageSelect.append(option);
    return;
  }
  const dot = document.createElement('button');
  dot.type = 'button';
  dot.className = 'page-dot';
  dot.setAttribute('aria-label', index === 0 ? 'Abrir capa' : `Abrir combo ${index}`);
  dot.addEventListener('click', () => goToPage(index));
  dotsContainer.append(dot);
});

function setViewerState(nextState) {
  viewerState = nextState;
  viewerPanel.dataset.state = nextState;
}

function updateControls(pageIndex = currentPage) {
  const previousPage = currentPage;
  currentPage = Math.max(0, Math.min(pageIndex, pages.length - 1));
  viewerPanel.dataset.coverVisible = String(currentPage === 0);
  preloadNearbyPages(currentPage);
  if (currentPage !== 0) finishCoverSignature();
  else if (previousPage !== 0) animateCoverSignature();
  const controlsLocked = navigationLocked || ['loading', 'error', 'dragging', 'flipping'].includes(viewerState);
  counter.textContent = `${currentPage + 1} / ${pages.length}`;
  counter.setAttribute('aria-label', `Página ${currentPage + 1} de ${pages.length}`);
  previousButton.disabled = currentPage === 0 || controlsLocked;
  const lastVisiblePage = currentPage + (currentPage > 0 && pageFlip?.getOrientation() === 'landscape' ? 1 : 0);
  nextButton.disabled = lastVisiblePage >= pages.length - 1 || controlsLocked;
  if (pageSelect) {
    pageSelect.value = String(currentPage);
    pageSelect.disabled = controlsLocked;
  }
  [...dotsContainer.children].forEach((dot, index) => {
    dot.disabled = controlsLocked;
    if (index === currentPage) dot.setAttribute('aria-current', 'page');
    else dot.removeAttribute('aria-current');
  });
}

function canNavigate() {
  return pageFlip && viewerState === 'idle' && !navigationLocked;
}

function lockNavigation() {
  navigationLocked = true;
  clearTimeout(navigationUnlockTimer);
  updateControls(currentPage);
  navigationUnlockTimer = window.setTimeout(() => {
    navigationLocked = false;
    if (viewerState === 'flipping') setViewerState('idle');
    updateControls(pageFlip?.getCurrentPageIndex() ?? currentPage);
  }, (reducedMotion ? 240 : flipbookConfig.animationDuration) + 100);
}

async function goToPage(index) {
  if (!canNavigate() || index === currentPage || index < 0 || index >= pages.length) return;
  setViewerState('loading');
  updateControls(currentPage);
  await preloadNearbyPages(index);
  setViewerState('flipping');
  lockNavigation();
  pageFlip.flip(index, 'bottom');
}

function flipNext() {
  if (!canNavigate() || nextButton.disabled) return;
  setViewerState('flipping');
  lockNavigation();
  pageFlip.flipNext('bottom');
}

function flipPrevious() {
  if (!canNavigate() || currentPage <= 0) return;
  setViewerState('flipping');
  lockNavigation();
  pageFlip.flipPrev('bottom');
}

function setZoom(value) {
  if (!flipbookConfig.enableZoom) return;
  const mobileLimit = window.innerWidth < 640 ? 1.08 : 1.2;
  zoomLevel = Math.max(0.84, Math.min(value, mobileLimit));
  viewerPanel.style.setProperty('--book-zoom', zoomLevel.toFixed(2));
  bookStage.classList.toggle('is-zoomed', zoomLevel > 1.001);
  zoomOutButton.disabled = zoomLevel <= 0.84;
  zoomInButton.disabled = zoomLevel >= mobileLimit;
}

async function toggleFullscreen() {
  if (!document.fullscreenEnabled) return;
  try {
    if (document.fullscreenElement === viewerPanel) await document.exitFullscreen();
    else await viewerPanel.requestFullscreen();
  } catch {
    fullscreenButton.disabled = true;
  }
}

function showError(error) {
  console.error('Falha ao iniciar o flipbook:', error);
  setViewerState('error');
  viewerPanel.classList.remove('is-loading');
  viewerPanel.classList.add('is-error');
  errorMessage.hidden = false;
  updateControls(0);
}

function initializeFlipbook() {
  if (!window.St?.PageFlip) {
    showError(new Error('Biblioteca StPageFlip indisponível'));
    return;
  }

  try {
    pageFlip = new window.St.PageFlip(bookElement, {
      width: 420,
      height: 600,
      size: 'stretch',
      minWidth: 280,
      maxWidth: 420,
      minHeight: 400,
      maxHeight: 600,
      drawShadow: flipbookConfig.enableShadows,
      flippingTime: reducedMotion ? 240 : flipbookConfig.animationDuration,
      usePortrait: flipbookConfig.autoResponsive,
      startPage: 0,
      autoSize: true,
      maxShadowOpacity: flipbookConfig.shadowIntensity,
      showCover: flipbookConfig.showCover,
      mobileScrollSupport: flipbookConfig.enableTouch,
      swipeDistance: 24,
      clickEventForward: true,
      useMouseEvents: flipbookConfig.enableDrag,
      showPageCorners: true,
      disableFlipByClick: false
    });

    pageFlip.on('init', event => {
      setViewerState('idle');
      viewerPanel.classList.remove('is-loading');
      bookElement.classList.add('is-ready');
      bookElement.dataset.orientation = event.data.mode;
      updateControls(event.data.page);
      animateCoverSignature();
    });

    pageFlip.on('flip', event => updateControls(event.data));

    pageFlip.on('changeState', event => {
      const stateMap = {
        read: 'idle',
        user_fold: 'dragging',
        fold_corner: 'dragging',
        flipping: 'flipping'
      };
      setViewerState(stateMap[event.data] || 'idle');
      updateControls(pageFlip.getCurrentPageIndex());
    });

    pageFlip.on('changeOrientation', event => {
      bookElement.dataset.orientation = event.data;
      requestAnimationFrame(() => updateControls(pageFlip.getCurrentPageIndex()));
    });

    pageFlip.loadFromHTML(pages);
  } catch (error) {
    showError(error);
  }
}

previousButton.addEventListener('click', flipPrevious);
pageSelect?.addEventListener('change', event => goToPage(Number(event.target.value)));
nextButton.addEventListener('click', flipNext);
zoomOutButton.addEventListener('click', () => setZoom(zoomLevel - 0.08));
zoomInButton.addEventListener('click', () => setZoom(zoomLevel + 0.08));
fitButton.addEventListener('click', () => setZoom(1));
fullscreenButton.addEventListener('click', toggleFullscreen);

document.addEventListener('keydown', event => {
  if (!flipbookConfig.enableKeyboard || event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.target.closest('input, textarea, select')) return;
  if (event.key === 'ArrowLeft') flipPrevious();
  if (event.key === 'ArrowRight') flipNext();
});

document.addEventListener('fullscreenchange', () => {
  fullscreenButton.setAttribute('aria-label', document.fullscreenElement ? 'Sair da tela cheia' : 'Abrir em tela cheia');
  if (pageFlip) requestAnimationFrame(() => pageFlip.update());
});

if (!document.fullscreenEnabled) fullscreenButton.hidden = true;

const resizeObserver = new ResizeObserver(entries => {
  const width = entries[0]?.contentRect.width || 0;
  if (!pageFlip || Math.abs(width - lastViewerWidth) < 2) return;
  lastViewerWidth = width;
  cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(() => {
    setZoom(Math.min(zoomLevel, window.innerWidth < 640 ? 1.08 : 1.2));
    if (viewerState === 'idle') pageFlip.update();
  });
});
resizeObserver.observe(viewerPanel);

window.addEventListener('pagehide', () => {
  finishCoverSignature();
  cancelAnimationFrame(resizeFrame);
  clearTimeout(navigationUnlockTimer);
  resizeObserver.disconnect();
}, { once: true });

document.addEventListener('visibilitychange', () => {
  if (document.hidden) finishCoverSignature();
});

updateControls(0);
initializeFlipbook();
