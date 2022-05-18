export function HTMLTextLinksCodeToMarkdown(el) {
  const childNodes = Array.from(el?.childNodes || []);
  const textContent = el.textContent.trim();
  if (el.nodeName === 'PRE') {
    if (el.childNodes[0].nodeName === 'CODE') {
      return (
        '```{r, eval = FALSE}\n' + `${textContent.replace(/ /g, ' ')}` + '\n```'
      );
    } else {
      return textContent;
    }
  } else if (el.nodeName === 'TABLE') {
    return HTMLTableToMarkdown(el);
  } else if (el.nodeName === 'UL') {
    return HTMLListToMarkdown(el) + '\n';
  } else if (el.nodeName === 'H1') {
    return `## ${textContent}`;
  } else if (el.nodeName === 'H4' || el.nodeName === 'H5') {
    return `### ${textContent}`;
  }
  const textNodes = childNodes.map(c => {
    const textContent = c.textContent.trim();

    if (c.nodeName === 'A') {
      const childNode = c.childNodes[0]; // we don't expect more than one child note at this point
      if (childNode) {
        if (childNode.nodeName === 'CODE') {
          // in UI, this looks like inline code cell with link inside
          return `[\`${textContent}\`](${c.href})`;
        } else {
          //we expect childNode.nodeName === '#text', ignoring other possible cases
          //should be regular link
          return `[${textContent}](${c.href})`;
        }
      } else {
        // shouldn't be a possible case, but outputting is then probably safest option
        return textContent;
      }
    } else if (c.nodeName === 'CODE') {
      return `\`${textContent}\``;
    } else {
      // regular text node
      return textContent;
    }
  });

  return textNodes
    .join(' ')
    .replaceAll(/[`] [,\.\)]/g, m => m[0] + m[2])
    .replaceAll(/[\(] [`]/g, m => m[0] + m[2]);
}

export function HTMLListToMarkdown(ul, indentLevel = 0) {
  const childElements = Array.from(ul.children);
  return (
    '\n' +
    childElements
      .map(ulChild => {
        if (ulChild.nodeName === 'LI') {
          const liChildNodes = Array.from(ulChild.childNodes);
          return liChildNodes
            .map(liChild => {
              if (liChild.textContent.trim().length === 0) {
                return '';
              } else {
                if (liChild.nodeName === 'UL') {
                  return HTMLListToMarkdown(liChild, indentLevel + 1);
                } else {
                  const textContent = liChild.textContent;
                  if (liChild.nodeName === 'CODE')
                    return '`' + textContent + '`';
                  return liChild.textContent;
                }
              }
            })
            .filter(str => str.trim().length > 0)
            .join('')
            .replaceAll(' .', '.');
        } else {
          return ulChild.textContent.trim(); // should only be line breaks or empty text nodes
        }
      })
      .filter(str => str.length > 0)
      .map(str => '    '.repeat(indentLevel) + ' * ' + str)
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
