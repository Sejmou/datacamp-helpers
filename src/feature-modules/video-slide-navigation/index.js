import { selectElements, selectSingleElement } from '../../util/dom.js';
import { addShortcut, FunctionShortcut } from '../keyboard-shortcuts/index.js';

class VideoSeeker {
  constructor(video) {
    this.video = video;
    this._seekingForward = false;
    this._seekingBackward = false;
  }

  async seekForward() {
    this._seekingForward = true;
    this.video.pause();
    while (this._seekingForward) {
      await seekVideo(this.video, 0.5);
    }
  }

  async seekBackward() {
    this._seekingBackward = true;
    this.video.pause();
    while (this._seekingBackward) {
      await seekVideo(this.video, -0.5);
    }
  }

  stopSeeking() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    this._seekingForward = false;
    this._seekingBackward = false;
  }

  get seekingForward() {
    return this._seekingForward;
  }

  get seekingBackward() {
    return this._seekingBackward;
  }
}

export function enable() {
  console.log('slide navigation enabled (atm, this has no special effect)');

  const videoSeeker = new VideoSeeker(selectSingleElement('video'));

  const slideState = new Proxy(
    {
      currSlideIdx: -1,
      slideCount: -1,
      currFragIdx: -1,
      fragCount: -1,
    },
    {
      slideChanged: false,
      set: function (target, key, value) {
        if (key === 'currSlideIdx' && value !== target.currSlideIdx) {
          this.slideChanged = true;
        }
        target[key] = value;

        const allFragmentsVisible = target.currFragIdx === target.fragCount - 1;
        if (allFragmentsVisible) console.log('all fragments visible!');

        if (
          (videoSeeker.seekingForward &&
            (target.currSlideIdx === target.slideCount - 1 ||
              (this.slideChanged && allFragmentsVisible))) ||
          (videoSeeker.seekingBackward &&
            (target.currSlideIdx === 0 ||
              (this.slideChanged && allFragmentsVisible)))
        ) {
          console.log('Stop seeking!');
          console.log(slideState);
          videoSeeker.stopSeeking();
          this.slideChanged = false;
        }

        console.log('state updated!', target);

        return true;
      },
    }
  );

  const updateSlideState = () => {
    const { currSlideIdx, currFragIdx, fragCount, slideCount } =
      getSlideState();

    slideState.currSlideIdx = currSlideIdx;
    slideState.currFragIdx = currFragIdx;
    slideState.fragCount = fragCount;
    slideState.slideCount = slideCount;
  };

  const slideContainer = selectSingleElement('.slides');
  const slideObs = new MutationObserver(updateSlideState);
  Array.from(slideContainer.children).forEach(slide =>
    slideObs.observe(slide, { attributes: true })
  );

  addShortcut(
    new FunctionShortcut(
      {
        code: 'KeyK',
        ctrlKey: true,
        shiftKey: true,
      },
      () => videoSeeker.seekForward(),
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
      () => videoSeeker.seekBackward(),
      true
    )
  );
}

function getSlideState() {
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
  const fragCount = Math.max(...fragIndices) + 1;
  const currFrag = slideFragments.find(el =>
    el.className.includes('current-fragment')
  );
  const currFragIdx = currFrag
    ? +currFrag.getAttribute('data-fragment-index')
    : -1;

  // for debug purposes
  console.log(
    `Currently viewing slide ${currSlideIdx + 1}/${slideCount}`,
    slideFragments.length > 0
      ? `(${
          currFragIdx == -1 ? 0 : currFragIdx + 1
        } of ${fragCount} fragments visible)`
      : ''
  );

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
    video.addEventListener(
      'seeked',
      () => {
        console.log('done seeking, current video time: ', video.currentTime);
        resolve();
      },
      {
        once: true,
      }
    );
  });
}
