import * as fs from 'fs';
import * as path from 'path';

import { Do, Task } from 'ftld';
import { fetch } from 'undici';

const baseDir = process.cwd();
const hymnsDir = path.join(baseDir, 'hymns');
const hymnsFilePath = path.join(hymnsDir, 'hymns.json');
const categoriesFilePath = path.join(hymnsDir, 'categories.json');

class ErrorFetchingCategories extends Error {
  _tag = 'ErrorFetchingCategories' as const;
  constructor(cause?: unknown) {
    super();
    this.cause = cause;
  }
}

class ErrorFetchingHymns extends Error {
  _tag = 'ErrorFetchingHymns' as const;
  constructor(cause?: unknown) {
    super();
    this.cause = cause;
  }
}

class ErrorFetchingHymn extends Error {
  _tag = 'ErrorFetchingHymn' as const;
  constructor(cause?: unknown) {
    super();
    this.cause = cause;
  }
}

class ErrorWritingHymn extends Error {
  _tag = 'ErrorWritingHymn' as const;
  constructor(cause?: unknown) {
    super();
    this.cause = cause;
  }
}

class ErrorWritingDir extends Error {
  _tag = 'ErrorWritingDir' as const;
  constructor(cause?: unknown) {
    super();
    this.cause = cause;
  }
}

const base = 'https://sda-hymnal.com/api';
const getCategories = Task.from(
  async () => {
    const categories = await fetch(base + '/categories').then((res) =>
      res.json(),
    );
    return categories as { id: number; name: string }[];
  },
  (e) => new ErrorFetchingCategories(e),
);

const getHymns = Task.from(
  async () => {
    const hymns = await fetch(base + '/hymns').then((res) => res.json());
    return hymns as {
      id: number;
      categoryId: number;
      name: string;
      verses: null;
    }[];
  },
  (e) => new ErrorFetchingHymns(e),
);

const getHymn = (id: number, categories: { id: number; name: string }[]) =>
  Task.from(
    async () => {
      const hymn = (await fetch(base + '/hymns/' + id).then((res) =>
        res.json(),
      )) as {
        id: number;
        categoryId: number;
        name: string;
        verses: { id: number; text: string }[];
      };
      return {
        id: hymn.id,
        category: categories.find((c) => c.id === hymn.categoryId)?.name,
        category_id: hymn.categoryId,
        name: hymn.name,
        verses: hymn.verses,
      };
    },
    (e) => new ErrorFetchingHymn(e),
  );

const main = Do(function* () {
  const categories = yield* getCategories;
  const hymnsWithoutVerses = yield* getHymns;
  let count = 0;
  const hymns = yield* Task.parallel(
    hymnsWithoutVerses.map((hymn) =>
      getHymn(hymn.id, categories).tap(() => {
        count++;
        console.log(`Downloaded ${count}/${hymnsWithoutVerses.length} hymns`);
      }),
    ),
    50,
  );

  yield* Task.from(
    async () => {
      await fs.promises.mkdir(hymnsDir, { recursive: true }).catch(() => {});
    },
    () => new ErrorWritingDir(),
  );

  yield* Task.from(
    async () => {
      console.log('Writing to hymns to file');
      await fs.promises.writeFile(
        hymnsFilePath,
        JSON.stringify(hymns, null, 2),
      );
      console.log('Done.');
    },
    () => new ErrorWritingHymn(),
  );
  yield* Task.from(async () => {
    console.log('Writing to categories to file');
    await fs.promises.writeFile(
      categoriesFilePath,
      JSON.stringify(categories, null, 2),
    );
    console.log('Done.');
  });
});

main.unwrap().catch((e) => {
  console.error(e);
  process.exit(1);
});
