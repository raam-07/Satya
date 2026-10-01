/** @type {import('next').NextConfig} */
const nextConfig = {
  staticPageGenerationTimeout: 300,
  // Keeps the expensive data-cache entries in Turso so a deploy doesn't re-query every page.
  cacheHandler: require.resolve('./cache-handler.js'),
}
module.exports = nextConfig
