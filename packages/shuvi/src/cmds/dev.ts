import program from 'commander';
import { createShuviServer } from '@shuvi/service';
import chalk from '@shuvi/utils/lib/chalk';
import logger, { printServerUrl } from '@shuvi/utils/lib/logger';
import { getPackageInfo, getProjectDir } from '../utils';
import { getConfigFromCli } from '../config';
import { initShuvi } from '../shuvi';

export default async function main(argv: string[]) {
  const startTime = performance.now();
  const pkgInfo = getPackageInfo();
  program
    .name(pkgInfo.name)
    .usage(`dev [dir] [options]`)
    .helpOption()
    .option('--host <host>', 'specify host')
    .option('--port <port>', 'specify port')
    .option('--config <file>', 'path to config file')
    .option('--config-overrides <json>', 'config overrides json')
    .parse(argv, { from: 'user' });

  const cwd = getProjectDir(program);
  const port = Number(program.port) || 3000;
  const host = program.host || 'localhost';
  const config = await getConfigFromCli(cwd, program);

  const api = await initShuvi({
    cwd,
    config
  });

  await api.buildApp();
  const bundler = await api.getBundler();
  const shuviApp = await createShuviServer({
    context: api.pluginContext,
    dev: true,
    bundler,
    ...api.serverConfigs
  });
  try {
    await shuviApp.listen(port, host);
    const appUrl = `http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`;
    const startupDurationString = startTime
      ? chalk.dim(
          `ready in ${chalk.white(
            chalk.bold(Math.ceil(performance.now() - startTime))
          )} ms`
        )
      : '';
    logger.info(
      `\n  ${chalk.green(
        `${chalk.bold('SHUVI')} v${pkgInfo.version}`
      )} ${startupDurationString}\n`
    );
    printServerUrl(appUrl);
  } catch (err: any) {
    if (err.code === 'EADDRINUSE') {
      let errorMessage = `Port ${port} is already in use.`;
      errorMessage += '\nUse `--port` to specify some other port.';
      // tslint:disable-next-line
      logger.error(errorMessage);
    } else {
      // tslint:disable-next-line
      logger.error(err);
    }
    await api.destory();
    process.nextTick(() => process.exit(1));
  }
}
