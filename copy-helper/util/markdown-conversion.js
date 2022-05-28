import { selectSingleElement, selectElements, getTextContents } from './dom.js';

export function HTMLElementToMarkdown(el, listIndentLvl = 0) {
  const childNodes = Array.from(el?.childNodes || []);
  const textContent = el.textContent.trim();
  if (el.nodeName === 'PRE') {
    if (childNodes[0].nodeName === 'CODE') {
      return (
        '```{r, eval = FALSE}\n' + `${textContent.replace(/ /g, ' ')}` + '\n```'
      );
    } else {
      return textContent;
    }
  } else if (el.nodeName === 'TABLE') {
    return HTMLTableToMarkdown(el);
  } else if (el.nodeName === 'UL' && !el.identifiedAsList) {
    return HTMLListToMarkdown(el, listIndentLvl) + '\n';
  } else if (el.nodeName === 'H1') {
    return `## ${textContent}`;
  } else if (el.nodeName === 'H4' || el.nodeName === 'H5') {
    return `### ${textContent}`;
  } else if (el.nodeName === 'A') {
    const childNode = childNodes[0]; // we don't expect more than one child note at this point
    if (childNode) {
      if (childNode.nodeName === 'CODE') {
        // in UI, this looks like inline code cell with link inside
        return `[\`${textContent}\`](${el.href})`;
      } else {
        //we expect childNode.nodeName === '#text', ignoring other possible cases
        //should be regular link
        return `[${textContent}](${el.href})`;
      }
    } else {
      // shouldn't be a possible case, but outputting is then probably safest option
      return textContent;
    }
  } else if (el.nodeName === 'CODE') {
    return `\`${textContent}\``;
  } else if (
    el.nodeName === 'LI' ||
    el.nodeName === 'DIV' ||
    el.nodeName === 'P'
  ) {
    return childNodes
      .map(c => HTMLElementToMarkdown(c, listIndentLvl))
      .filter(mdStr => mdStr.length > 0)
      .join(' ')
      .replaceAll(/[`] [,\.\)]/g, m => m[0] + m[2])
      .replaceAll(/[\(] [`]/g, m => m[0] + m[2]);
  } else {
    if (el.nodeName === 'SPAN') {
      // DataCamp uses KaTeX for displaying LaTeX code
      // LaTeX code is stored in annotation elements (nested quite deeply inside a span element)
      // those annotation elements have an "encoding" attribute with value "application/x-tex"
      const latexCode = getTextContents('[encoding="application/x-tex"]', el);
      if (latexCode.length > 0) {
        // at this point we know that we are dealing with a span element for LaTeX code
        // only relevant content is the LaTeX code we found - wrap it with "$" to produce valid R markdown
        return latexCode.map(c => `$${c}$`).join('\n');
      }
    }

    // otherwise we're dealing with a regular text node
    return textContent;
  }
}

export function HTMLListToMarkdown(ul, indentLevel = 0) {
  return (
    '\n' +
    Array.from(ul.childNodes)
      .map(n => {
        if (n.textContent.trim().length === 0) return '';
        const md = HTMLElementToMarkdown(n, indentLevel + 1);
        const res = `${'    '.repeat(indentLevel)} * ${md}`;
        return res;
      })
      .filter(str => str.length > 0)
      .join('\n')
  );
}

// adapted from: https://gist.github.com/styfle/c4bba2d29e6cb9b585de72207c006af7
function HTMLTableToMarkdown(el) {
  let outputStr = '| ';
  const thead = selectSingleElement('thead', el);
  const headcells = selectElements('th, td', thead);
  for (let i = 0; i < headcells.length; i++) {
    const cell = headcells[i];
    const cellText = cell.textContent.trim();
    // header cell text should always be bold
    outputStr += (cellText.length > 0 ? ' **' + cellText + '** ' : '') + '| ';
  }

  outputStr += '\n';

  for (let i = 0; i < headcells.length; i++) {
    outputStr += '|---------';
  }

  outputStr += '|\n';

  const tbody = selectSingleElement('tbody', el);
  const trs = selectElements('tr', tbody);
  for (let i = 0; i < trs.length; i++) {
    outputStr += '| ';
    const tr = trs[i];
    const tds = selectElements('td', tr);
    for (let j = 0; j < tds.length; j++) {
      const td = tds[j];
      const childNodes = Array.from(td.childNodes);
      const cellText = childNodes
        .map(node => {
          const textContent = node.textContent.trim();
          if (node.nodeName === 'STRONG') return ` **${textContent}** `;
          if (node.nodeName === 'CODE') return `\`${textContent}\``;
          return textContent;
        })
        .join('');
      outputStr += cellText + ' | ';
    }
    outputStr += '\n';
  }

  // adding empty line in the beginning to make sure markdown table is parsed correctly
  // e.g. if it follows heading directly, without empty line, Markdown output is incorrect (table is interpreted as part of the heading)
  return '\n' + outputStr;
}
