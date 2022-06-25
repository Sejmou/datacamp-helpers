import { selectSingleElement, selectElements } from '../../util/dom.js';

export async function getSlideState() {
  const slideContainer = selectSingleElement('.video-slides>.slides');
  if (!slideContainer) {
    console.warn('no slide container found! Cannot return slide state');
    return;
  }

  const slides = Array.from(slideContainer.children);
  const currentSlide = slides.find(el => el.style.display !== 'none');
  const currSlideIdx = slides.findIndex(el => el.style.display !== 'none');
  const slideCount = slides.length;

  const slideFragments = selectElements('[data-fragment-index]', currentSlide);
  const fragIndicesStr = slideFragments.map(el =>
    el.getAttribute('data-fragment-index')
  );
  const fragIndices = fragIndicesStr.map(el => +el);
  const fragCount = fragIndices.length === 0 ? 1 : Math.max(...fragIndices) + 1;
  const currFrag = slideFragments.find(el =>
    el.className.includes('current-fragment')
  );
  const currFragIdx = currFrag
    ? +currFrag.getAttribute('data-fragment-index')
    : fragCount === 1
    ? 0
    : -1;

  // for debug purposes
  // console.log(
  //   `Currently viewing slide ${currSlideIdx + 1}/${slideCount}`,
  //   slideFragments.length > 0
  //     ? `(${
  //         currFragIdx == -1 ? 0 : currFragIdx + 1
  //       } of ${fragCount} fragments visible)`
  //     : ''
  // );

  return {
    currSlideIdx,
    slideCount,
    currFragIdx,
    fragCount,
  };
}
