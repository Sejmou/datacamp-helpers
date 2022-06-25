import { getSlideState } from './slide-state.js';

export class SlideFinder {
  #video;
  #seekStepSize = 0.5;

  constructor(video) {
    this.#video = video;
  }

  async findNextSlide() {
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
        const newSlideState = await this.#seekAndGetSlideState(
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
      const newSlideState = await this.#seekAndGetSlideState(
        this.#seekStepSize
      );
      lastFragmentReached =
        currentSlideState.currFragIdx === currentSlideState.fragCount - 1;
      currentSlideState = newSlideState;
    }
  }

  async findPreviousSlide() {
    let currentSlideState = await getSlideState();

    let atFirstSlide = currentSlideState.currSlideIdx === 0;
    if (atFirstSlide) {
      // cannot go back any further!
      return;
    }

    // we need to wait until the previous slide is reached in the video
    let slideChanged = false;

    while (!slideChanged) {
      const newSlideState = await this.#seekAndGetSlideState(
        -this.#seekStepSize
      );
      slideChanged =
        newSlideState.currSlideIdx != currentSlideState.currSlideIdx;
      currentSlideState = newSlideState;
    }
  }

  async #seekAndGetSlideState(seekTimestep) {
    this.#video.pause();
    await seekVideo(this.#video, seekTimestep);
    return getSlideState();
  }
}

async function seekVideo(video, timeDelta) {
  video.currentTime += timeDelta;

  return new Promise(resolve => {
    video.addEventListener('seeked', resolve, {
      once: true,
    });
  });
}
