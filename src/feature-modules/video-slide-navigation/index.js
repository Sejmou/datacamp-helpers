import { selectElements, selectSingleElement } from '../../util/dom.js';
import { addShortcut, FunctionShortcut } from '../keyboard-shortcuts/index.js';

class SlideFinder {
  #video;
  #seeking;
  #seekStepSize = 0.5;

  constructor(video) {
    this.#video = video;
    this.#seeking = false;
  }

  async findNextSlide() {
    if (this.#seeking) {
      console.warn('already seeking, this call will be ignored');
      return;
    }

    let currentSlideState = await getSlideState();

    const currentSlideFullyLoaded =
      currentSlideState.currFragIdx === currentSlideState.fragCount - 1;

    if (currentSlideFullyLoaded) {
      const atLastSlide =
        currentSlideState.currSlideIdx === currentSlideState.slideCount - 1;

      if (atLastSlide) {
        //cannot go forward any further!
        return;
      }

      // we need to wait until the next slide is reached in the video
      let slideChanged = false;

      while (!slideChanged) {
        const newSlideState = await this.seekAndGetSlideState(
          this.#seekStepSize
        );
        slideChanged =
          newSlideState.currSlideIdx != currentSlideState.currSlideIdx;
        currentSlideState = newSlideState;
      }
    }

    let lastFragmentReached =
      currentSlideState.currFragIdx === currentSlideState.fragCount - 1;

    while (!lastFragmentReached) {
      const newSlideState = await this.seekAndGetSlideState(this.#seekStepSize);
      lastFragmentReached =
        currentSlideState.currFragIdx === currentSlideState.fragCount - 1;
      currentSlideState = newSlideState;
    }
  }

  async seekAndGetSlideState(seekTimestep) {
    this.#video.pause();
    await seekVideo(this.#video, seekTimestep);
    return getSlideState();
  }

  async findPreviousSlide() {
    if (this.#seeking) {
      console.warn('already seeking, this call will be ignored');
      return;
    }

    let currentSlideState = await getSlideState();

    let atFirstSlide = currentSlideState.currSlideIdx === 0;
    if (atFirstSlide) {
      // cannot go back any further!
      return;
    }

    // we need to wait until the previous slide is reached in the video
    let slideChanged = false;

    while (!slideChanged) {
      const newSlideState = await this.seekAndGetSlideState(
        -this.#seekStepSize
      );
      slideChanged =
        newSlideState.currSlideIdx != currentSlideState.currSlideIdx;
      currentSlideState = newSlideState;
    }
  }
}

export function enable() {
  console.log(
    'slide navigation enabled (use Ctrl + Shift + J to jump to next slide or Ctrl + Shift + K to jump to previous one)'
  );

  const slideFinder = new SlideFinder(selectSingleElement('video'));

  // TODO: fix issue with keyboard mapping conflict (K is also used as hotkey for play/pause of video)
  // if last video slide is reached, play/pause of video is still triggered when actually pressing ctrl + shift + k
  addShortcut(
    new FunctionShortcut(
      {
        code: 'KeyK',
        ctrlKey: true,
        shiftKey: true,
      },
      () => slideFinder.findNextSlide(),
      true
    )
  );

  addShortcut(
    new FunctionShortcut(
      {
        code: 'KeyJ',
        ctrlKey: true,
        shiftKey: true,
      },
      () => slideFinder.findPreviousSlide(),
      true
    )
  );
}

async function getSlideState() {
  const slideContainer = selectSingleElement('.slides');
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

async function seekVideo(video, timeDelta) {
  video.currentTime += timeDelta;

  return new Promise(resolve => {
    video.addEventListener('seeked', resolve, {
      once: true,
    });
  });
}
