import fs from 'fs';
import * as utils from '../utils';

const fixtures = fs
  .readdirSync(__dirname)
  .filter(name => name !== 'fixtures.test.ts');

// Note: jest.resetModules() would cause Error('Callback was already called.');
let buildFixture: typeof utils.buildFixture;
beforeEach(() => {
  buildFixture = require('../utils').buildFixture;
});

afterEach(() => {
  // force require to load file to make sure compiled file get load correctlly
  jest.resetModules();
});

describe('fixtures', () => {
  fixtures.forEach(fixture => {
    test(
      `build ${fixture}`,
      async () => {
        expect.hasAssertions();
        await buildFixture(fixture);
        expect(true).toBe(true);
      },
      5 * 60 * 1000
    );
  });
});
