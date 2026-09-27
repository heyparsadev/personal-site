import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

/** Home plus every project with its own page, in Work order. URLs match the canonical tags (no trailing slash). */
export const GET: APIRoute = async ({ site }) => {
  const pages = (await getCollection('projects')).filter((p) => p.data.page).sort((a, b) => a.data.order - b.data.order);
  const urls = [new URL('/', site).href, ...pages.map((p) => new URL(`/${p.id}`, site).href)];
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((u) => `  <url><loc>${u}</loc></url>`),
    '</urlset>',
    '',
  ].join('\n');
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
