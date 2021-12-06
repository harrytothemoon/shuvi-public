import { AppCtx, Page, launchFixture } from '../utils';

jest.setTimeout(5 * 60 * 1000);

const isProduction = process.env.NODE_ENV === 'production';

describe('Basic Features', () => {
  let ctx: AppCtx;
  let page: Page;

  beforeAll(async () => {
    ctx = await launchFixture('basic', { ssr: true }, {}, !isProduction);
  });
  afterAll(async () => {
    await page.close();
    await ctx.close();
  });

  test('Page /', async () => {
    page = await ctx.browser.page(ctx.url('/'));

    expect(page.statusCode).toBe(200);
    expect(await page.$$attr('body script', 'src')).toEqual(
      expect.arrayContaining([expect.stringMatching(/polyfill.*\.js/)])
    );
    expect(await page.$text('div')).toBe('Index Page');
  });

  test('Page /about', async () => {
    await page.close();
    page = await ctx.browser.page(ctx.url('/about'));
    expect(await page.$text('#about')).toBe('About Page');
  });

  test('should access process.env', async () => {
    await page.shuvi.navigate('/process-env');
    await page.waitForSelector('#process-env');
    expect(await page.$text('#process-env')).toBe(
      !isProduction ? 'development' : 'production'
    );
  });

  describe('404 Page', () => {
    let localPage: Page;
    afterAll(async () => {
      await localPage.close();
    });

    test('should work in client', async () => {
      localPage = await ctx.browser.page(ctx.url('/'));
      await localPage.shuvi.navigate('/none-exist-page');
      await localPage.waitForSelector('div[style]');
      expect(await localPage.$text('body')).toMatch(/404/);
    });

    test('should work in server', async () => {
      localPage = await ctx.browser.page(ctx.url('/none-exist-page'));

      await localPage.waitForSelector('div[style]');
      expect(localPage.statusCode).toBe(404);
      expect(await localPage.$text('body')).toMatch(/404/);
    });
  });

  describe('redirect', () => {
    let localPage: Page;
    afterAll(async () => {
      await localPage.close();
    });

    test('should work in server side', async () => {
      localPage = await ctx.browser.page(
        ctx.url('/redirect', { target: '/about' })
      );
      expect(await localPage.$text('div')).toBe('About Page');
    });

    test('should work in client side', async () => {
      await localPage.goto(ctx.url('/'));
      await localPage.shuvi.navigate('/redirect', { target: '/about' });
      await localPage.waitForSelector('#about');
      expect(await localPage.$text('#about')).toBe('About Page');
    });
  });

  describe('router', () => {
    let localPage: Page;
    afterEach(async () => {
      await localPage.close();
    });

    test('should have query object', async () => {
      localPage = await ctx.browser.page(ctx.url('/query', { foo: 'bar' }));
      const query = JSON.parse(await localPage.$text('#query'));
      expect(query.foo).toMatch('bar');
    });

    test('should have query object even no query is provided', async () => {
      localPage = await ctx.browser.page(ctx.url('/query'));
      const query = JSON.parse(await localPage.$text('#query'));
      expect(Object.keys(query).length).toBe(0);
    });
  });

  describe('Head', () => {
    let localPage: Page;
    afterEach(async () => {
      await localPage.close();
    });

    test('should have the default head tags', async () => {
      localPage = await ctx.browser.page(ctx.url('/default-head'));
      expect(await localPage.$$attr('meta[charset]', 'charset')).toEqual([
        'utf-8'
      ]);
    });

    test('should overwrite the default head tags', async () => {
      localPage = await ctx.browser.page(ctx.url('/overwrite-default-head'));
      expect(
        await localPage.$attr('meta[name="viewport"]', 'data-foo')
      ).toEqual('bar');
      expect(await localPage.$attr('meta[name="viewport"]', 'content')).toEqual(
        'width=device-width'
      );
    });

    test('should works on server', async () => {
      localPage = await ctx.browser.page(ctx.url('/head'));
      expect(await localPage.title()).toBe('Test Title');
    });

    test('should works on client', async () => {
      localPage = await ctx.browser.page(ctx.url('/'));
      expect(await localPage.$text('div')).toBe('Index Page');
      await localPage.shuvi.navigate('/head');
      await localPage.waitForSelector('#head');
      expect(await localPage.title()).toBe('Test Title');
    });

    test('support commonjs function', async () => {
      localPage = await ctx.browser.page(ctx.url('/support-commonjs'));
      expect(await localPage.$text('#support-commonjs')).toEqual(
        'exports.default'
      );
    });
  });

  describe('Middleware function', () => {
    let localPage: Page;
    afterEach(async () => {
      await localPage.close();
    });

    test('should return early by middleware', async () => {
      localPage = await ctx.browser.page(ctx.url('/middleware/a/b?name=true'));
      expect(await localPage.$text('body')).toMatch(
        /when req\.query\.name true return earlier/
      );
      localPage = await ctx.browser.page(
        ctx.url('/middleware/a/b/name?name=666')
      );
      expect(await localPage.$text('body')).toMatch(
        /when req\.query\.name true return earlier/
      );
    });

    test('should run middleware has order', async () => {
      // ensure path has been compiled
      localPage = await ctx.browser.page(
        ctx.url('/middleware/a/deep/other/more')
      );
      const consoleSpy = jest.spyOn(console, 'log');
      localPage = await ctx.browser.page(
        ctx.url('/middleware/a/deep/other/more')
      );
      const consoleResult = consoleSpy.mock.calls.join('');
      expect(consoleResult).toBe(
        [
          'root req.url  /middleware/a/deep/other/more',
          '[local] req.url  /middleware/a/deep/other/more',
          '[local]=>deep=>req.url  /middleware/a/deep/other/more',
          '[local]=>deep=>[[...other]]=>req.url  /middleware/a/deep/other/more',
          ''
        ].join('\n')
      );
    });
  });
});

describe('[SPA] Basic Features', () => {
  let ctx: AppCtx;
  let page: Page;

  beforeAll(async () => {
    ctx = await launchFixture('basic', {
      ssr: false,
      router: { history: 'browser' }
    });
  });
  afterAll(async () => {
    await page.close();
    await ctx.close();
  });

  test('Page /', async () => {
    page = await ctx.browser.page(ctx.url('/'));
    expect(await page.$$attr('body script', 'src')).toEqual(
      expect.arrayContaining([expect.stringMatching(/polyfill.*\.js/)])
    );
    await page.waitForSelector('#index');
    expect(await page.$text('#index')).toBe('Index Page');
  });

  test('Page /about', async () => {
    await page.goto(ctx.url('/about'));
    await page.waitForSelector('#about');
    expect(await page.$text('#about')).toBe('About Page');
  });

  test('process-env', async () => {
    await page.shuvi.navigate('/process-env');
    await page.waitForSelector('#process-env');
    expect(await page.$text('#process-env')).toBe('development');
  });

  test('support commonjs function', async () => {
    await page.goto(ctx.url('/support-commonjs'));
    expect(await page.$text('#support-commonjs')).toEqual('exports.default');
  });

  test('error-page', async () => {
    page = await ctx.browser.page(ctx.url('/hmr/err?a=1'));
    await page.waitForSelector('#error');
    expect(await page.$text('#error')).toContain('custom error 502');
    await page.shuvi.navigate('/about');
    await page.waitForSelector('#about');
    expect(await page.$text('#about')).toBe('About Page');
    await page.shuvi.navigate('/hmr/err');
    await page.waitForSelector('#err');
    expect(await page.$text('#err')).toBe('Err Page Render');
  });
});
