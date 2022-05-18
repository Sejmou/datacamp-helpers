import {
  HTMLListToMarkdown,
  HTMLTextLinksCodeToMarkdown,
} from '../copy-helper.js';
import { selectElements } from '../util/dom.js';

export function videoIframeCrawler(includeCodeOutput) {
  const slideContents = selectElements('.slide-content>div') //>*>div>div')
    .map(el => {
      const childNodes = Array.from(el.childNodes);
      const sectionHeadingSlideH1El = el.querySelector('h1');
      if (sectionHeadingSlideH1El) {
        // section heading slide - only relevant element is the slide title
        return `## ${sectionHeadingSlideH1El.textContent.trim()}`;
      } else {
        // regular slide
        return childNodes
          .map(c => {
            if (c.nodeName === 'H2') {
              // slide title
              return `### ${c.textContent.trim()}\n`;
            }
            if (c.nodeName === 'DIV') {
              // we can find actual slide content nested a few layers deeper
              const content = selectElements('.dc-slide-region>div>*', c);
              return content
                .map(el => {
                  if (
                    el.nodeName === 'PRE' // code is always inside <code> tag wrapped by <pre>
                  ) {
                    if (
                      includeCodeOutput ||
                      !el.className.includes('lang-out')
                      //lang-out is for output code cells - we skip over them, except if explicitly included
                    ) {
                      return (
                        '```' +
                        `${
                          el.className.includes('lang-r')
                            ? `{r${includeCodeOutput ? ', eval=FALSE' : ''}}`
                            : ''
                        }` +
                        '\n' +
                        el.textContent.trim() +
                        '\n```'
                      );
                    }
                    //lang-out is for output code cells - we skip over them, except if explicitly included
                    return '';
                  } else if (el.nodeName === 'UL') {
                    return HTMLListToMarkdown(el) + '\n'; // need additional line break after lists in Markdown!
                  } else {
                    return HTMLTextLinksCodeToMarkdown(el);
                  }
                })
                .join('\n');
            } else {
              // this should be the only two possible cases that are relevant/possible
              // each regular slide should only contain single h2 and single div with bunch of other nested divs
              return '';
            }
          })
          .join('');
      }
    })
    .filter((slide, i, slides) => slide !== slides[i - 1]) // remove slide pages that are exactly the same
    .map((slide, i, slides) => {
      const prevLines = slides[i - 1]?.split('\n');
      if (!prevLines) return slide;

      const currLines = slide.split('\n');
      // first line of each slide's markdown is the heading
      const headingsIdentical = prevLines[0] === currLines[0];

      if (headingsIdentical) {
        return currLines.slice(1).join('\n');
      }
      return slide;
    })
    .join('\n\n');

  return `${slideContents}`;
}
