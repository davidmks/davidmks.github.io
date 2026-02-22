import { getCollection } from 'astro:content';

export function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export const WORDS_PER_MINUTE = 230;

export async function getPublishedPosts() {
  return (await getCollection('blog', ({ data }) => !data.draft))
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}
