/**
 * Custom webpack config for NestJS API.
 * Marks Prisma native engine as external so webpack doesn't try to bundle it.
 */
module.exports = function (options) {
  const lazyImports = [
    '@prisma/client',
    '.prisma/client',
    '.prisma/client/default',
    'sharp',
    // Remotion — uses its own webpack bundler at runtime, must not be compiled by NestJS
    'remotion',
    '@remotion/bundler',
    '@remotion/renderer',
    '@remotion/media-utils',
    'react',
    'react-dom',
    'react/jsx-runtime',
    'react/jsx-dev-runtime',
  ];

  return {
    ...options,
    externals: [
      // Keep any existing externals from NestJS defaults
      ...(Array.isArray(options.externals) ? options.externals : options.externals ? [options.externals] : []),
      // Prisma native engine must not be bundled
      function ({ request }, callback) {
        if (lazyImports.includes(request)) {
          return callback(null, 'commonjs ' + request);
        }
        callback();
      },
    ],
  };
};
