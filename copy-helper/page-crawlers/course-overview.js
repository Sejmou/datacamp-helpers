import { selectElements, getTextContent } from '../util/dom.js';

export function overviewCrawler() {
  let chapters = selectElements('.chapter');
  chapters = chapters.map(c => ({
    title: getTextContent('.chapter__title', c),
    description: getTextContent('.chapter__description', c),
  }));

  chapters = chapters.map(c => `# ${c.title}\n${c.description}`);

  chapters = chapters.join('\n\n\n\n\n\n');

  return `---
title: 'Data Acquisition and Survey Methods (2022S) Exercise X: ${getTextContent(
    '.header-hero__title'
  )}'
author: "Samo Kolter (1181909)"
date: "\`r Sys.setlocale('LC_TIME', 'en_GB.UTF-8'); format(Sys.time(), '%d %B, %Y')\`"
output: 
  pdf_document:
    toc: true # activate table of content
    toc_depth: 3
    number_sections: true
urlcolor: blue
---

${getTextContent('.course__description')}

${chapters}
`;
}
