(async () => {
  const result = { viewport: [innerWidth, innerHeight], pages: [], failures: [], rapidNavigation: null };
  const ready = () => new Promise(resolve => requestAnimationFrame(resolve));
  await document.fonts.ready;
  while (!pageFlip || viewerState !== 'idle') await new Promise(resolve => setTimeout(resolve, 100));
  finishCoverSignature();
  for (let index = 0; index < pages.length; index += 1) {
    document.body.dataset.qaIndex = String(index);
    await preloadNearbyPages(index);
    pageFlip.turnToPage(index);
    await ready();
    const page = pages[index];
    const box = page.getBoundingClientRect();
    const inner = page.querySelector('.catalog-page-inner') || page.querySelector('.cover-content');
    const nodes = [...inner.children].filter(node => getComputedStyle(node).display !== 'none');
    const out = nodes.filter(node => {
      const rect = node.getBoundingClientRect();
      return rect.top < box.top + 10 || rect.bottom > box.bottom - 10 || rect.left < box.left || rect.right > box.right;
    }).map(node => node.className || node.tagName);
    const item = { index, name: page.getAttribute('aria-label'), size: [Math.round(box.width), Math.round(box.height)], out,
      imageErrors: [...page.querySelectorAll('img[data-catalog-image]')].filter(img => !img.complete || !img.naturalWidth).length };
    result.pages.push(item);
    if (out.length || item.imageErrors) result.failures.push(item);
  }
  pageFlip.turnToPage(0);
  await ready();
  goToPage(3);
  goToPage(8);
  goToPage(15);
  await new Promise(resolve => setTimeout(resolve, 1150));
  result.rapidNavigation = pageFlip.getCurrentPageIndex();
  result.docWidth = document.documentElement.scrollWidth;
  result.orientation = pageFlip.getOrientation();
  result.imagesLoaded = document.querySelectorAll('img[data-catalog-image][src]').length;
  result.pdfLinks = [...document.querySelectorAll('.catalog-downloads a')].map(link => link.href);
  const pre = document.createElement('pre');
  pre.id = 'qa-result';
  pre.textContent = JSON.stringify(result);
  pre.hidden = true;
  document.body.append(pre);
  document.title = `QA ready ${result.failures.length}`;
})();
