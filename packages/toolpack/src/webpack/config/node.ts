import { WebpackChain, baseWebpackChain, BaseOptions } from './base';
import { nodeExternals } from './parts/external';
import { withStyle } from './parts/style';
import { addExternals } from './parts/helpers';

export function createNodeWebpackChain(options: BaseOptions): WebpackChain {
  const { dev } = options;
  const chain = baseWebpackChain(options);

  chain.target('node');
  chain.devtool(dev ? 'cheap-module-source-map' : false);
  chain.resolve.extensions.merge([
    '.ts',
    '.tsx',
    '.js',
    '.mjs',
    '.jsx',
    '.json',
    '.wasm'
  ]);
  // fix: Can't reexport the named export 'BREAK' from non EcmaScript module
  // related issue: https://github.com/graphql/graphql-js/issues/1272
  chain.resolve.mainFields.clear().add('main').add('module');

  chain.output.libraryTarget('commonjs2');
  chain.optimization.minimize(false);
  addExternals(
    chain,
    nodeExternals({
      projectRoot: options.projectRoot,
      include: options.include
    })
  );

  chain.module
    .rule('main')
    .oneOf('js')
    .use('shuvi-swc-loader')
    .tap(options => ({
      ...options,
      isServer: true
    }));

  chain.plugin('define').tap(([options]) => [
    {
      ...options,
      __BROWSER__: false
    }
  ]);

  return withStyle(chain, {
    ssr: true,
    lightningCss: options.lightningCss,
    filename: 'static/css/[contenthash:8].css',
    chunkFilename: 'static/css/[contenthash:8].chunk.css'
  });
}
