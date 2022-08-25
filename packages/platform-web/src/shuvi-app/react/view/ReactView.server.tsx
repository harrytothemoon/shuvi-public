import * as React from 'react';
import { renderToString } from 'react-dom/server';
import { redirect } from '@shuvi/platform-shared/shared';
import { SHUVI_ERROR } from '@shuvi/shared/lib/constants';
import { Router } from '@shuvi/router-react';
import chalk from '@shuvi/utils/lib/chalk';
import { IHtmlTag } from '../../../shared';
import Loadable, { LoadableContext } from '../loadable';
import AppContainer from '../AppContainer';
import { IReactServerView, IReactAppData } from '../types';
import { Head } from '../head';
import { serializeServerError } from '../../helper/serializeServerError';

export class ReactServerView implements IReactServerView {
  renderApp: IReactServerView['renderApp'] = async ({
    req,
    app,
    manifest,
    isDev
  }) => {
    await Loadable.preloadAll();

    const { router, appComponent: AppComponent, setError: setAppError } = app;
    await router.ready;

    // todo: move these into renderer
    let { pathname, matches, redirected } = router.current;
    // handler no matches
    if (!matches.length) {
      setAppError(SHUVI_ERROR.PAGE_NOT_FOUND);
    }

    if (redirected) {
      return redirect(pathname);
    }

    const loadableModules: string[] = [];
    let htmlContent: string | undefined = undefined;
    let head: IHtmlTag[];

    const RootApp = (
      <Router static router={router}>
        <AppContainer app={app}>
          <LoadableContext.Provider
            value={moduleName => loadableModules.push(moduleName)}
          >
            <AppComponent />
          </LoadableContext.Provider>
        </AppContainer>
      </Router>
    );

    try {
      htmlContent = renderToString(RootApp);
    } catch (error: any) {
      if (isDev) {
        console.error(chalk.red('error') + ' - ' + error.stack);
      }
      setAppError(serializeServerError(error, isDev));
      htmlContent = renderToString(RootApp); // Consistency on both server and client side
    } finally {
      head = Head.rewind() || [];
    }

    const { loadble } = manifest;
    const dynamicImportIdSet = new Set<string>();
    const dynamicImportChunkSet = new Set<string>();
    for (const mod of loadableModules) {
      const manifestItem = loadble[mod];
      if (manifestItem) {
        manifestItem.files.forEach(file => {
          dynamicImportChunkSet.add(file);
        });
        manifestItem.children.forEach(item => {
          dynamicImportIdSet.add(item.id as string);
        });
      }
    }

    const preloadDynamicChunks: IHtmlTag<'link'>[] = [];
    const styles: IHtmlTag<'link'>[] = [];
    for (const file of dynamicImportChunkSet) {
      if (/\.js$/.test(file)) {
        preloadDynamicChunks.push({
          tagName: 'link',
          attrs: {
            rel: 'preload',
            href: req.getAssetUrl(file),
            as: 'script'
          }
        });
      } else if (/\.css$/.test(file)) {
        styles.push({
          tagName: 'link',
          attrs: {
            rel: 'stylesheet',
            href: req.getAssetUrl(file)
          }
        });
      }
    }
    const appData: IReactAppData = {
      dynamicIds: [...dynamicImportIdSet]
    };
    if (dynamicImportIdSet.size) {
      appData.dynamicIds = Array.from(dynamicImportIdSet);
    }

    return {
      appData,
      content: htmlContent,
      htmlAttrs: {},
      headBeginTags: [...head, ...preloadDynamicChunks],
      headEndTags: [...styles],
      bodyBeginTags: [],
      bodyEndTags: []
    };
  };
}
