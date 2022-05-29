import { readFileSync, writeFileSync } from 'fs';
import glob from 'glob';
import { chdir } from 'process';

// https://stackoverflow.com/a/41462807/13727176
async function getDirectories(root) {
  return new Promise((resolve, reject) =>
    glob(root + '/**/*', (err, fileNames) => {
      if (err) reject();
      else {
        const jsFileNames = fileNames.filter(n => n.endsWith('.js'));
        resolve(jsFileNames);
      }
    })
  );
}

async function main() {
  // switch to main chrome extension folder
  chdir('..');

  // add all module files to web_accessible_resources of manifest.json
  // otherwise we get errors when using import/export with content script related modules
  const manifestPath = 'manifest.json';
  const manifest = JSON.parse(readFileSync(manifestPath));

  const moduleFilePaths = await getDirectories('src');

  manifest.web_accessible_resources = moduleFilePaths;
  // reason for weird-looking call to stringify() is pretty-printing: https://stackoverflow.com/a/5670892/13727176
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  // as the file imports are often also wrong (missing .js extension), we also need to fix them:
  const copyHelperFiles = moduleFilePaths.map(path => ({
    path,
    content: readFileSync(path, 'utf-8'),
  }));

  // pattern for finding all "from" parts of import ... from statements
  const pattern = new RegExp(/([\s\n}]from[\s\n]*'.*[^\.][^j][^s])'/);

  copyHelperFiles.forEach(file => {
    const { content, path } = file;
    let remainingContent = content;

    let contentWithFixedImports = '';

    while (remainingContent.length > 0) {
      const match = remainingContent.match(pattern);
      if (match) {
        contentWithFixedImports +=
          remainingContent.slice(0, match.index) + match[1] + '.js';

        remainingContent = remainingContent.slice(
          match.index + match[1].length
        );
      } else {
        contentWithFixedImports += remainingContent;
        remainingContent = '';
      }
    }

    writeFileSync(path, contentWithFixedImports);
  });
  // TODO: finish
}

main();
