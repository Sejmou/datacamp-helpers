import { getTextContent, selectElements } from '../util/dom.js';

export function videoPageCrawler() {
  const title = getTextContent('.exercise-area h1');
  const transcriptElements = selectElements(
    'section.vex-body>div[tabindex]>div>*',
    document,
    false
  );
  const transcriptContent = transcriptElements
    .map(el => {
      const textContentAsMarkdown = Array.from(el.childNodes)
        .map(child => {
          const textContent = child.textContent.trim();

          if (child.nodeName === 'H2') {
            return `### ${textContent}`;
          } else {
            return textContent + '\n';
          }
        })
        .join('\n');
      return textContentAsMarkdown;
    })
    .join('\n');

  return `## ${title}\n${transcriptContent}`;
}
