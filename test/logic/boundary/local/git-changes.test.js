import { describe, expect, test } from '@jest/globals';
import { execFileSync } from 'node:child_process';
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  renameSync,
  rmSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseGitChanges } from '../../../../src/logic/boundary/local/git-changes.js';

describe('Git name/status boundary', () => {
  test.each([undefined, null, false, 12, {}, [], Symbol('output'), 1n])(
    'rejects non-string process output %p',
    value => expect(parseGitChanges(value)).toEqual({ ok: false })
  );

  test.each([
    'M',
    'M\0',
    'M\0file',
    'M\0\0',
    'M\0file\0D\0',
    'R100\0before\0after\0',
    'C\0file\0',
    'X\0file\0',
    'AM\0file\0',
    'Mextra\0file\0',
    'extraM\0file\0',
    '\0file\0',
    'd\0file\0',
    'D\0old\0Q\0bad\0',
  ])(
    'rejects incomplete/unsupported evidence %p without partial results',
    value => {
      expect(parseGitChanges(value)).toEqual({ ok: false });
    }
  );

  test('accepts empty output as a complete empty comparison', () => {
    expect(parseGitChanges('')).toEqual({
      ok: true,
      paths: [],
      deletedPaths: [],
    });
  });

  test('preserves all statuses, duplicate paths and path bytes', () => {
    const paths = [
      'src/new.js',
      'src/old.js',
      'space name.js',
      'line\nname.js',
      'tab\tname.js',
      'src/old.js',
    ];
    const output = ['A', 'D', 'M', 'T', 'U', 'D']
      .map((status, index) => `${status}\0${paths[index]}\0`)
      .join('');
    expect(parseGitChanges(output)).toEqual({
      ok: true,
      paths,
      deletedPaths: ['src/old.js', 'src/old.js'],
    });
  });

  test('parses actual Git rename, deletion and restored-file status output', () => {
    const directory = mkdtempSync(
      path.join(os.tmpdir(), 'dadeto-git-changes-')
    );
    const git = args =>
      execFileSync('git', args, { cwd: directory, encoding: 'utf8' });
    try {
      git(['init', '--quiet']);
      mkdirSync(path.join(directory, 'src'));
      writeFileSync(
        path.join(directory, 'src', 'old name.js'),
        'export const value = 1;\n'
      );
      writeFileSync(
        path.join(directory, 'src', 'deleted.js'),
        'export const removed = 2;\n'
      );
      git(['add', '-A']);
      git([
        '-c',
        'user.name=Fixture',
        '-c',
        'user.email=fixture@example.invalid',
        'commit',
        '--quiet',
        '-m',
        'baseline',
      ]);
      renameSync(
        path.join(directory, 'src', 'old name.js'),
        path.join(directory, 'src', 'new name.js')
      );
      rmSync(path.join(directory, 'src', 'deleted.js'));
      git(['add', '-A']);
      expect(
        parseGitChanges(
          git(['diff', '--cached', '--name-status', '-z', '--no-renames'])
        )
      ).toEqual({
        ok: true,
        paths: ['src/deleted.js', 'src/new name.js', 'src/old name.js'],
        deletedPaths: ['src/deleted.js', 'src/old name.js'],
      });
      git(['restore', '--staged', '--worktree', 'src/deleted.js']);
      const restored = parseGitChanges(
        git(['diff', '--cached', '--name-status', '-z', '--no-renames'])
      );
      expect(restored).toEqual({
        ok: true,
        paths: ['src/new name.js', 'src/old name.js'],
        deletedPaths: ['src/old name.js'],
      });
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
