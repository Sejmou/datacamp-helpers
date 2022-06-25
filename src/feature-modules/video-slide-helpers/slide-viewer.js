import { selectSingleElement } from '../../util/dom.js';
import { SlideFinder } from './slide-finder.js';

export class SlideViewer {
  #slideFinder;
  #slideVideo;
  #displayModeCheckbox;
  #background;
  #showingSlidesOnly;
  #slideContainer;
  #slideContainerParent;

  constructor(slideVideo, displayModeCheckbox) {
    this.#slideFinder = new SlideFinder(slideVideo);
    this.#slideVideo = slideVideo;
    this.#background = this.#createBackground();
  }

  addDisplayModeCheckbox(displayModeCheckbox) {
    this.#displayModeCheckbox = displayModeCheckbox;
    console.log(this.#displayModeCheckbox);
  }

  async nextSlide() {
    this.#revertShowingCurrentSlideContent();
    await this.#slideFinder.findNextSlide();
    if (this.#showingSlidesOnly) this.#showCurrentSlideContent();
  }

  async previousSlide() {
    this.#revertShowingCurrentSlideContent();
    await this.#slideFinder.findPreviousSlide();
    if (this.#showingSlidesOnly) this.#showCurrentSlideContent();
  }

  /**
   * shows the video slides in a separate view, allowing marking and copying text + images as well
   */
  showSlides() {
    if (this.#displayModeCheckbox) this.#displayModeCheckbox.checked = true;
    this.#showingSlidesOnly = true;
    this.#background.style.display = 'block';
    this.#showCurrentSlideContent();
    if (this.#slideVideo.currentTime === 0) {
      // play button is still visible, we need to quickly play and pause video
      // otherwise play button would cover the screen while viewing the slides
      this.#slideVideo.play();
    }
    this.#slideVideo.pause();
  }

  returnToVideo() {
    if (this.#displayModeCheckbox.checked)
      this.#displayModeCheckbox.checked = false;
    this.#showingSlidesOnly = false;
    this.#background.style.display = 'none';
    this.#revertShowingCurrentSlideContent();
  }

  #createBackground() {
    const bg = document.createElement('div');
    bg.style.width = '100%';
    bg.style.height = '100%';
    bg.style.backgroundColor = 'white';
    bg.style.position = 'absolute';
    bg.style.zIndex = '900';
    bg.style.top = '0';
    bg.style.left = '0';
    bg.style.display = 'none';
    document.body.appendChild(bg);
    return bg;
  }

  #showCurrentSlideContent() {
    this.#background.innerHTML = '';
    const slideContainer = selectSingleElement('.video-slides>.slides');
    this.#slideContainerParent = slideContainer.parentElement;
    const currentSlide = Array.from(slideContainer.children).find(
      c => c.style.display === 'block'
    );
    selectSingleElement('.slide-content', currentSlide).style.pointerEvents =
      'all';

    this.#background.appendChild(slideContainer);
    this.#slideContainer = slideContainer;
  }

  #revertShowingCurrentSlideContent() {
    if (!this.#slideContainer) {
      return;
    }
    this.#slideContainerParent.appendChild(this.#slideContainer);
    this.#slideContainer = null;
  }
}
