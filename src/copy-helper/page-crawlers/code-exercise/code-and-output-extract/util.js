export function removeCommentsFromCodeLines(codeLines) {
  const noCommentLines = codeLines.map(line => {
    if (line.trim().length === 0) {
      // keep regular empty lines
      return line;
    } else {
      const noCommentsLine = removeComments(line);
      // if line consists of only comments, we get back empty string
      if (noCommentsLine.trim().length === 0) {
        // use null as indicator that line should be removed!
        return null;
      }
      return noCommentsLine;
    }
  });

  return noCommentLines.filter(l => l !== null);
}

export function removeComments(line) {
  const matchRes = line.match(/(.*(?<!["']))(#.*)/);
  if (!matchRes) {
    // line includes no comment
    return line;
  }
  const code = matchRes[1];
  return code;
}
