import rss from '@astrojs/rss';
import { SITE_CONFIG } from '../site';
import { getPublishedPosts } from '../utils';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  if (!context.site) {
    throw new Error('site is not set in astro.config.mjs — RSS feed requires it');
  }

  const posts = await getPublishedPosts();

  return rss({
    title: SITE_CONFIG.name,
    description: SITE_CONFIG.description,
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.pubDate,
      description: post.data.description,
      link: `/blog/${post.id}/`,
    })),
  });
}
