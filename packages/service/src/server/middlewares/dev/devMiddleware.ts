import * as path from 'path';
import ws from 'ws';
import { IncomingMessage } from 'http';
import {
  BUNDLER_DEFAULT_TARGET,
  DEV_HOT_LAUNCH_EDITOR_ENDPOINT,
  DEV_HOT_MIDDLEWARE_PATH
} from '@shuvi/shared/lib/constants';
import { createLaunchEditorMiddleware } from './launchEditorMiddleware';
import { DynamicDll } from '@shuvi/toolpack/lib/webpack';
import WebpackDevMiddleware from './shuvi-dev-middleware';
import { WebpackHotMiddleware } from './hotMiddleware';
import { getBundler } from '../../../bundler';
import { Server } from '../../http-server';
import { IServerPluginContext } from '../../plugin';

const wsServer = new ws.Server({ noServer: true });
export interface DevMiddleware {
  apply(server?: Server): void;
  send(action: string, payload?: any): void;
  invalidate(): Promise<unknown>;
  waitUntilValid(force?: boolean): void;
  onHMR(req: IncomingMessage, socket: any, head: Buffer): void;
}

export async function getDevMiddleware(
  serverPluginContext: IServerPluginContext
): Promise<DevMiddleware> {
  const bundler = await getBundler(serverPluginContext);
  let compiler;
  let dynamicDll: DynamicDll | null = null;

  if (serverPluginContext.config.experimental.preBundle) {
    dynamicDll = new DynamicDll({
      cacheDir: path.join(serverPluginContext.paths.cacheDir, 'dll'),
      rootDir: serverPluginContext.paths.rootDir,
      exclude: [/react-refresh/]
    });
  }

  compiler = await bundler.getWebpackCompiler(dynamicDll);
  // watch before pass compiler to WebpackDevMiddleware
  bundler.watch({
    onErrors(errors) {
      send('errors', errors);
    },
    onWarns(warns) {
      send('warns', warns);
    }
  });

  // webpackDevMiddleware make first compiler build assets as static sources
  const webpackDevMiddleware = WebpackDevMiddleware(compiler as any, {
    publicPath: serverPluginContext.assetPublicPath
  });

  const webpackHotMiddleware = new WebpackHotMiddleware({
    compiler: bundler.getSubCompiler(BUNDLER_DEFAULT_TARGET)!,
    path: DEV_HOT_MIDDLEWARE_PATH
  });

  const apply = (server: Server) => {
    const targetServer = server;
    targetServer.use(webpackDevMiddleware);
    targetServer.use(
      createLaunchEditorMiddleware(DEV_HOT_LAUNCH_EDITOR_ENDPOINT)
    );
    if (dynamicDll) {
      targetServer.use(dynamicDll.middleware);
    }
  };

  const send = (action: string, payload?: any) => {
    webpackHotMiddleware.publish({ action, data: payload });
  };

  const invalidate = () => {
    return new Promise(resolve => {
      webpackDevMiddleware.invalidate(resolve);
    });
  };

  const waitUntilValid = (force: boolean = false) => {
    if (force) {
      // private api
      // we know that there must be a rebuild so it's safe to do this
      // @ts-ignore
      webpackDevMiddleware.context.state = false;
    }
    return new Promise(resolve => {
      webpackDevMiddleware.waitUntilValid(resolve);
    });
  };

  const onHMR = (req: IncomingMessage, _res: any, head: Buffer) => {
    wsServer.handleUpgrade(req, req.socket, head, client => {
      webpackHotMiddleware.onHMR(client);
    });
  };

  return {
    apply,
    send,
    invalidate,
    waitUntilValid,
    onHMR
  };
}
