import path from 'path';
import fse from 'fs-extra';
import { parseTemplateFile } from './viewTemplate';
import {
  BUILD_DEFAULT_DIR,
  BUILD_SERVER_DIR,
  BUILD_MANIFEST_PATH,
  BUILD_SERVER_FILE_SERVER,
  IPluginContext
} from '@shuvi/service';

function resolveServerDist(ctx: IPluginContext, name: string) {
  const manifest = ctx.resources.serverManifest;
  return path.join(
    ctx.paths.buildDir,
    BUILD_SERVER_DIR,
    manifest.bundles[name]
  );
}

function resolveDocument(ctx: IPluginContext) {
  const customDoc = path.resolve(ctx.paths.srcDir, 'document.ejs');
  if (fse.existsSync(customDoc)) {
    return customDoc;
  }

  return require.resolve('@shuvi/platform-core/template/document.ejs');
}

export const getCoreResources = (context: IPluginContext) => {
  const { buildDir } = context.paths;
  return [
    {
      identifier: 'clientManifest',
      loader: () =>
        require(path.join(buildDir, BUILD_DEFAULT_DIR, BUILD_MANIFEST_PATH))
    },
    {
      identifier: 'serverManifest',
      loader: () =>
        require(path.join(buildDir, BUILD_SERVER_DIR, BUILD_MANIFEST_PATH))
    },
    {
      identifier: 'server',
      loader: () =>
        require(resolveServerDist(context, BUILD_SERVER_FILE_SERVER))
    },
    {
      identifier: 'documentTemplate',
      loader: () => parseTemplateFile(resolveDocument(context))
    }
  ];
};
