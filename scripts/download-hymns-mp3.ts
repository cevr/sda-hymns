import * as cheerio from 'cheerio';
import * as fs from 'fs';
import { Do, Task } from 'ftld';
import * as path from 'path';
import { unescape } from 'querystring';

const baseDir = process.cwd();
const hymnsDir = path.join(baseDir, 'hymns');

class ErrorFetchingHymns extends Error {
  _tag = 'ErrorFetchingHymns' as const;
}

class ErrorFetchingHymn extends Error {
  _tag = 'ErrorFetchingHymn' as const;
}

class ErrorWritingHymn extends Error {
  _tag = 'ErrorWritingHymn' as const;
}

class ErrorWritingDir extends Error {
  _tag = 'ErrorWritingDir' as const;
}

const getHymns = Task.from(
  async () => {
    const $ = await cheerio.fromURL('https://sdahymnals.com/Hymnal/mp3/');
    const hymns = $('a')
      .map((_, el) => $(el).attr('href'))
      .get()
      .filter(
        // we want only the files that start with the hymn number
        // so a patern like 001
        (href) => href.match(/^\d{3}/),
      )
      .map((href) => ({
        href: `https://sdahymnals.com/Hymnal/mp3/${href}`,
        name: href,
      }));
    return hymns;
  },
  () => new ErrorFetchingHymns(),
);

export const main = Do(function* () {
  const hymns = yield* getHymns;
  let count = 0;
  yield* Task.from(
    async () => {
      // ensure hymns directory exists
      await fs.promises.mkdir(hymnsDir, { recursive: true }).catch(() => {});
    },
    () => new ErrorWritingDir(),
  );
  yield* Task.parallel(
    hymns.map((hymn) =>
      Task.from(
        async () => {
          return (await fetch(hymn.href)).arrayBuffer();
        },
        () => new ErrorFetchingHymn(),
      )
        .map((buffer) => ({ buffer, name: hymn.name }))
        .flatMap((mp3) => {
          return Task.from(
            async () => {
              await fs.promises.writeFile(
                path.join(hymnsDir, unescape(mp3.name)),
                Buffer.from(mp3.buffer),
              );
            },
            () => new ErrorWritingHymn(),
          );
        })
        .tap(() => {
          count++;
          console.log(`Downloaded ${count}/${hymns.length} hymns `);
        }),
    ),
    10,
  );
});

main.run();
