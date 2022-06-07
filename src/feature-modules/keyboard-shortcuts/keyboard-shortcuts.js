import { getCodeSubExerciseLink } from '../../util/shared.js';
import { selectElements } from '../../util/dom.js';
import { copyToClipboard } from '../../util/other.js';

// Three types of shortcuts are supported:
// 1. EditorTypingShortcut: Paste any given string to the clipboard
//      Usage: press shortcut for required symbol, it will then be pasted to your clipboard and you just have to do ctrl + v to insert the symbol
//      Unfortunately, direct pasting from the script is not possible due to security restrictions on the JavaScript Clipboard API :/
//
// 2. ShortcutWorkaround: They essentially make DataCamp's built-in shortcuts work (for details see comments in/above class)
// 3. FunctionShortcut: Execute arbitrary functions when hitting the assigned key combination

// There may be a smarter way to store key combinations and shortcuts; If you know one, let me know lol
class KeyCombination {
  constructor(keyboardEventInit) {
    // set defaults
    this.altKey = false;
    this.ctrlKey = false;
    this.shiftKey = false;
    this.metaKey = false;
    // override with values defined in keyboardEventInit
    Object.assign(this, keyboardEventInit);
  }

  matches(keyboardEvent) {
    for (const [prop, value] of Object.entries(this)) {
      if (keyboardEvent[prop] !== value) {
        return false;
      }
    }

    return true;
  }
}

class KeyboardShortcut {
  // should emulate an abstract base class: https://stackoverflow.com/a/30560792/13727176

  // accept two different KeyboardEventInit objects as input, each serving different purpose:
  // 1. for creating the KeyCombination instance that is used for detecting whether a given key combination (KeyboardEvent) should be handled by the shortcut
  // 2. for setting up the keyboard event(s) that should be triggered by the shortcut
  constructor(config) {
    if (new.target === KeyboardShortcut) {
      throw new TypeError(
        'KeyboardShortcut class is abstract, cannot instantiate directly!'
      );
    }

    const { kbComboKbEvtInit, dispatchedKbEvtInit, shouldPreventDefault } =
      config;

    this.keyCombination = new KeyCombination(kbComboKbEvtInit);
    if (dispatchedKbEvtInit) {
      // some keyboard shortcuts may trigger new keyDown event based on KeyboardEventInit
      this.keyboardEvent = new KeyboardEvent('keydown', dispatchedKbEvtInit);
    }
    this.shouldPreventDefault = shouldPreventDefault;
  }

  handle(keyboardEvent) {
    if (this.keyCombination.matches(keyboardEvent)) {
      if (this.shouldPreventDefault) {
        keyboardEvent.preventDefault();
      }
      this.apply(keyboardEvent);
      return true;
    }
    return false;
  }

  // Note: not all subclasses of Shortcut need the keyboardEvent
  apply(keyboardEvent) {
    throw new TypeError(
      'Cannot call apply() on KeyboardShortcut - abstract! Implement in subclass!'
    );
  }
}

class EditorTypingShortcut extends KeyboardShortcut {
  constructor(assignedShortCutKbEvtInit, outputStr) {
    super({
      kbComboKbEvtInit: assignedShortCutKbEvtInit,
    });

    this.outputStr = outputStr;
  }

  apply() {
    const editorTextArea = selectElements(
      '.inputarea.monaco-mouse-cursor-text'
    )[0];
    if (editorTextArea) {
      copyToClipboard(this.outputStr);
      editorTextArea.focus();
      document.execCommand('paste');
    }
  }
}

// Some DataCamp shortcuts are not "well-chosen", e.g. Ctrl + J for going to previous lesson
// This shortcut doesn't work in Google Chrome as is, because per default, this opens the downloads
// A simple way to fix this would have been to add preventDefault() in the keydown event listener, but apparently DataCamp's developers forgot about that
// Another issue is that some DataCamp shortcuts (e.g. Ctrl + K) don't work when using the code editor, probably because it also has keybindings for the same combination
// This class works around those issues
class ShortcutWorkaround extends KeyboardShortcut {
  constructor(kbEvtInit, shouldPreventDefault = false) {
    // both the handled and dispatched KeyboardEvent are practically the same
    super({
      kbComboKbEvtInit: kbEvtInit,
      dispatchedKbEvtInit: kbEvtInit,
      shouldPreventDefault,
    });
  }

  apply(keyboardEvent) {
    keyboardEvent.preventDefault();
    keyboardEvent.stopImmediatePropagation();

    if (!keyboardEvent.repeat) {
      const activeElement = document.activeElement;
      document.body.focus();
      document.body.dispatchEvent(this.keyboardEvent);
      activeElement.focus();
      this.shortcutBeingPressed = true;
    }
  }

  handleShortcutKeyReleased(keyboardEvent) {
    if (keyboardEvent.code === this.keyCombination.code) {
      this.shortcutBeingPressed = false;
    }
  }
}

// allows running an arbitrary function by pressing a shortcut
class FunctionShortcut extends KeyboardShortcut {
  constructor(kbEvtInit, fn, shouldPreventDefault = false) {
    super({ kbComboKbEvtInit: kbEvtInit, shouldPreventDefault });
    this.fn = fn;
  }

  apply(keyBoardEvent) {
    this.fn(keyBoardEvent);
  }
}

// Stores a collection of KeyboardShortcuts; can be used to find and apply shortcuts
class KeyboardShortcuts {
  // shortcuts should be an array of KeyboardShortcut objects
  // TODO: add logic for checking if multiple shortcuts listen for same KeyCombination
  constructor(shortcuts) {
    this.shortcuts = shortcuts;
  }

  // applies a shortcut if it matches
  // TODO: think about whether multiple shortcut bindings for same keyboard combination should be allowed
  // If yes, current solution wouldn't work
  applyMatching(keyboardEvent) {
    return this.shortcuts.find(s => s.handle(keyboardEvent));
  }

  // TODO: add logic for checking if keybinding for KeyCombination of shortcut already exists
  add(shortcut) {
    this.shortcuts.push(shortcut);
  }
}

function createShortcuts() {
  // Feel free to add more
  return new KeyboardShortcuts([
    new EditorTypingShortcut({ code: 'Slash', altKey: true }, '<-'),
    new EditorTypingShortcut({ code: 'Period', altKey: true }, '%>%'),
    new EditorTypingShortcut({ code: 'KeyI', altKey: true }, '%in%'),
    new EditorTypingShortcut({ code: 'KeyR', altKey: true }, '%R%'),
    new ShortcutWorkaround({
      // Ctrl + J
      key: 'j',
      code: 'KeyJ',
      location: 0,
      ctrlKey: true,
      shiftKey: false,
      altKey: false,
      metaKey: false,
      repeat: false,
      isComposing: false,
      charCode: 0,
      keyCode: 74,
      which: 74,
      detail: 0,
      bubbles: true,
      cancelable: true,
      composed: true,
    }),
    new ShortcutWorkaround({
      // Ctrl + K
      key: 'k',
      code: 'KeyK',
      location: 0,
      ctrlKey: true,
      shiftKey: false,
      altKey: false,
      metaKey: false,
      repeat: false,
      isComposing: false,
      charCode: 0,
      keyCode: 75,
      which: 75,
      detail: 0,
      bubbles: true,
      cancelable: true,
      composed: true,
    }),
    new ShortcutWorkaround({
      key: 'o',
      code: 'KeyO',
      location: 0,
      ctrlKey: true,
      shiftKey: false,
      altKey: false,
      metaKey: false,
      repeat: false,
      isComposing: false,
      charCode: 0,
      keyCode: 79,
      which: 79,
      detail: 0,
      bubbles: true,
      cancelable: true,
      composed: true,
    }),
    // TODO: maybe add class for shortcuts that only apply to certain page?
    // Note: Would probably require change in KeyboardShortcuts (applyMatching()!), too
    new FunctionShortcut(
      {
        key: 'Escape',
        code: 'Escape',
        location: 0,
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
        metaKey: false,
        repeat: false,
        isComposing: false,
        charCode: 0,
        keyCode: 27,
        which: 27,
        detail: 0,
        bubbles: true,
        cancelable: true,
        composed: true,
      },
      () => {
        const modal = document.querySelector('.modal-overlay'); // modal that opens after hitting Ctrl + O
        if (modal) {
          // close modal
          modal.click();
        } else {
          // leave any element that is currently focussed (probably code editor if in main window or video player if in video-iframe)
          document.activeElement.blur();

          if (getCurrentPage() === 'video-iframe') {
            chrome.runtime.sendMessage(
              notificationIds.escKeyPressFromVideoIframe
            );
          }
        }
      }
    ),
    new FunctionShortcut(
      {
        key: 'f',
        code: 'KeyF',
        location: 0,
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
        metaKey: false,
        repeat: false,
        isComposing: false,
        charCode: 0,
        keyCode: 70,
        which: 70,
        detail: 0,
        bubbles: true,
        cancelable: true,
        composed: true,
      },
      keyboardEvent => {
        const currentPage = getCurrentPage();
        if (currentPage === 'video-page') {
          const videoIframeWindow = document.querySelector(
            'iframe[title*="video"]'
          )?.contentWindow; // contentWindow of iframe video is running in
          videoIframeWindow?.focus();
          // notify script instance running in iframe that it should focus the video player
          chrome.runtime.sendMessage(notificationIds.fKeyPressFromVideoPage);
        }
      }
    ),
    new FunctionShortcut(
      {
        code: 'KeyE',
        altKey: true,
      },
      keyboardEvent => {
        if (getCurrentPage() === 'other') {
          // try to focus into the code editor (if it exists)
          const editorTextArea = document?.querySelector(
            'textarea.inputarea.monaco-mouse-cursor-text'
          );

          if (editorTextArea) {
            // we don't want to enter the pressed character ('f') into the editor - stop propagation!
            keyboardEvent.stopImmediatePropagation();
            keyboardEvent.preventDefault(); // Alt + E triggers some browser stuff otherwise

            // focus into editor window
            // for some reason, we have to wrap into setTimeout, otherwise 'f' is still entered into editor
            setTimeout(() => editorTextArea.focus(), 0);
          }
        }
      }
    ),
    new FunctionShortcut(
      {
        code: 'Enter',
        altKey: true,
      },
      () => document.querySelector('.dc-completed__continue button')?.click()
    ),
    new FunctionShortcut(
      {
        code: 'KeyJ',
        ctrlKey: true,
        shiftKey: true,
      },
      () => getCodeSubExerciseLink(-1)?.click(),
      true
    ),
    new FunctionShortcut(
      {
        code: 'KeyK',
        ctrlKey: true,
        shiftKey: true,
      },
      () => getCodeSubExerciseLink(1)?.click(),
      true
    ),
  ]);
}

const notificationIds = {
  fKeyPressFromVideoPage: 'f-key-video-page',
  escKeyPressFromVideoIframe: 'esc-key-video-iframe',
};

export function addKeyboardShortcuts() {
  const shortcuts = createShortcuts();
  const currentPage = getCurrentPage();

  if (currentPage === 'video-iframe') {
    const videoPlayer = document.activeElement;
    chrome.runtime.onMessage.addListener(message => {
      if (message === notificationIds.fKeyPressFromVideoPage) {
        videoPlayer.focus();
      }
    });
  } else {
    chrome.runtime.onMessage.addListener(message => {
      if (message === notificationIds.escKeyPressFromVideoIframe) {
        // remove focus for video in iframe -> focus is back in main document
        // regular DataCamp keyboard shortcuts work again
        document.activeElement.blur();
      }
    });
  }

  document.body.addEventListener(
    'keydown',
    ev => {
      if (!ev.isTrusted) {
        // we're dealing with a manually created event -> probably one we dispatched ourselves!
        return;
      }
      shortcuts.applyMatching(ev);
    },
    {
      capture: true, // should increase probability that event listener is triggered
    }
  );
}

function getCurrentPage() {
  if (document.querySelector('.slides')) {
    return 'video-iframe'; // inside video iframe
  } else if (
    // only true if video already loaded, while video is still loading, this is not available
    document.querySelector('[data-cy*="video-exercise"]')
  ) {
    return 'video-page';
  } else {
    return 'other';
  }
}
