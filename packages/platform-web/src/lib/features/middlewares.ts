import { IServerPluginContext, IServerMiddleware } from '@shuvi/service';
import { DevMiddleware } from '@shuvi/service/lib/server/middlewares/dev/devMiddleware';

import { OnDemandRouteManager } from './on-demand-compile-page';
import { getApiMiddleware, getMiddlewareMiddleware } from './filesystem-routes';
import { getSSRMiddleware } from './html-render';

let onDemandRouteManager: OnDemandRouteManager;

export const getMiddlewares = (
  context: IServerPluginContext
): IServerMiddleware[] => {
  const middlewaresFromPlugin = context.serverPluginRunner.middlewares().flat();
  return [
    ...middlewaresFromPlugin,
    onDemandRouteManager && onDemandRouteManager.ensureRoutesMiddleware(),
    getApiMiddleware(context),
    getMiddlewareMiddleware(context),
    getSSRMiddleware(context)
  ].filter(Boolean);
};

export const getMiddlewaresBeforeDevMiddlewares = (
  devMiddleware: DevMiddleware,
  context: IServerPluginContext
): IServerMiddleware => {
  onDemandRouteManager = new OnDemandRouteManager(context);
  onDemandRouteManager.devMiddleware = devMiddleware;
  return onDemandRouteManager.getServerMiddleware();
};
