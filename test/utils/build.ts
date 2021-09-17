import {
  IBuildOptions,
  build as shuviBuild
} from '@shuvi/service/lib/cli/build';

export async function build(options: IBuildOptions = {}) {
  await shuviBuild(options);
}
