import fs from 'fs';
import path from 'path';
import { describe, test, expect } from '@jest/globals';

const sourcePath = path.join(process.cwd(), 'src/core/browser/toys.js');

describe('inputHandlersMap constant source', () => {
  test('definition includes expected handler mappings', () => {
    const src = fs.readFileSync(sourcePath, 'utf8');
    // Stryker adds coverage calls to the isolated source before running the
    // baseline. Remove those calls so this contract checks the source mapping,
    // not the mutation tool's instrumentation.
    const instrumentedSourceRemoved = src.replace(
      /stry(?:MutAct|Cov|NS)_[A-Za-z0-9]+\([^)]*\),?\s*/g,
      ''
    );
    const mapStart = instrumentedSourceRemoved.indexOf('inputHandlersMap');
    const mapSource = instrumentedSourceRemoved.slice(mapStart);
    expect(mapSource).toMatch(
      /'gamepad-button-mapper'[\s\S]*joyConMapperHandler/
    );
    expect(mapSource).toMatch(
      /'object-minute-asset'[\s\S]*objectMinuteAssetHandler/
    );
    expect(mapSource).toMatch(
      /'possession-request'[\s\S]*possessionRequestHandler/
    );
    expect(mapSource).toMatch(/default[\s:]*[\s\S]*defaultHandler/);
  });
});
