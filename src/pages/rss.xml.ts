import rss from '@astrojs/rss';
import MarkdownIt from 'markdown-it';
import sanitizeHtml from 'sanitize-html';
import { SITE_CONFIG } from '../site';
import { getPublishedPosts } from '../utils';
import type { APIContext } from 'astro';

// Deliberately not Astro's pipeline: that runs Shiki, which bakes theme colors
// into style attributes that only work against our own CSS. Here code blocks
// stay plain <pre><code> so the reader can style them.
const markdown = new MarkdownIt({ html: true });

// Structure only, since our styling can't follow the content into a reader.
const ALLOWED_TAGS = [
  'p', 'br', 'hr',
  'h2', 'h3', 'h4', 'h5', 'h6',
  'strong', 'em', 'del', 'sup', 'sub',
  'a', 'img', 'figure', 'figcaption',
  'ul', 'ol', 'li',
  'blockquote', 'pre', 'code',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
];

/**
 * Render a post's markdown into feed-safe HTML.
 *
 * Relative hrefs and srcs resolve against `base`, the post's permalink. Feed
 * HTML is shown off our domain, where `/blog/foo` or `#fn1` would dangle.
 */
function renderForFeed(body: string, base: URL) {
  const absolute = (url?: string) => {
    if (!url) return url;
    try {
      return new URL(url, base).toString();
    } catch {
      return url;
    }
  };

  return sanitizeHtml(markdown.render(body), {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ['href', 'title'],
      img: ['src', 'alt', 'title', 'width', 'height'],
      // Readers that highlight code look for `language-*` here.
      code: ['class'],
      th: ['colspan', 'rowspan'],
      td: ['colspan', 'rowspan'],
    },
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, ...(attribs.href && { href: absolute(attribs.href)! }) },
      }),
      img: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, ...(attribs.src && { src: absolute(attribs.src)! }) },
      }),
    },
  });
}

export async function GET(context: APIContext) {
  if (!context.site) {
    throw new Error('site is not set in astro.config.mjs, RSS feed requires it');
  }

  const posts = await getPublishedPosts();
  const feedUrl = new URL('rss.xml', context.site);

  return rss({
    title: SITE_CONFIG.name,
    description: SITE_CONFIG.description,
    site: context.site,
    xmlns: {
      atom: 'http://www.w3.org/2005/Atom',
      dc: 'http://purl.org/dc/elements/1.1/',
    },
    customData: [
      '<language>en-us</language>',
      `<atom:link href="${feedUrl}" rel="self" type="application/rss+xml"/>`,
    ].join(''),
    items: posts.map((post) => {
      const link = `/blog/${post.id}/`;
      return {
        title: post.data.title,
        pubDate: post.data.pubDate,
        // Shown instead of the full post when a subscriber prefers previews.
        description: post.data.description,
        content: renderForFeed(post.body ?? '', new URL(link, context.site)),
        link,
        customData: `<dc:creator><![CDATA[${SITE_CONFIG.author}]]></dc:creator>`,
      };
    }),
  });
}
