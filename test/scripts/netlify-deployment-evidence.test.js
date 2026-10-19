import { describe, expect, it, jest } from '@jest/globals';
import {
  attachNetlifyDeploymentEvidence,
  main,
} from '../../.github/scripts/attach-netlify-deployment-evidence.js';

const registryObservation = {
  schemaVersion: 1,
  build: {
    runId: '123456789',
    sourceCommitSha: 'a'.repeat(40),
    observedAt: '2026-10-19T00:00:00.000Z',
  },
  registryObject: {
    url: 'https://storage.googleapis.com/example/registry.json',
    sha256: 'b'.repeat(64),
  },
};

const cliDeployment = Object.fromEntries([
  ['deploy_id', 'deploy-123'],
  ['deploy_url', 'https://deploy-123--example.netlify.app'],
  ['url', 'https://example.netlify.app'],
  ['site_id', 'site-123'],
  ['site_name', 'example'],
]);

const withCliDeploymentField = (field, value) => ({
  ...cliDeployment,
  [field]: value,
});

describe('Netlify deployment evidence', () => {
  it('attaches the CLI deployment ID and HTTPS URLs to the registry observation', () => {
    const result = attachNetlifyDeploymentEvidence({
      deploymentJson: JSON.stringify(cliDeployment),
      observationJson: JSON.stringify(registryObservation),
    });

    expect(JSON.parse(result)).toEqual({
      ...registryObservation,
      netlifyDeployment: {
        deploymentId: 'deploy-123',
        deploymentUrl: 'https://deploy-123--example.netlify.app/',
        siteUrl: 'https://example.netlify.app/',
      },
    });
  });

  it.each([
    [
      'malformed CLI JSON',
      '{',
      JSON.stringify(registryObservation),
      'Netlify CLI output must be valid JSON.',
    ],
    [
      'missing deploy ID',
      JSON.stringify(withCliDeploymentField('deploy_id', '')),
      JSON.stringify(registryObservation),
      'Netlify deploy_id must be a non-empty string.',
    ],
    [
      'non-HTTPS deploy URL',
      JSON.stringify(
        withCliDeploymentField('deploy_url', 'http://example.netlify.app')
      ),
      JSON.stringify(registryObservation),
      'Netlify deploy_url must be an HTTPS URL.',
    ],
    [
      'missing production URL',
      JSON.stringify({ ...cliDeployment, url: undefined }),
      JSON.stringify(registryObservation),
      'Netlify url must be a non-empty string.',
    ],
    [
      'non-HTTPS production URL',
      JSON.stringify({ ...cliDeployment, url: 'http://example.netlify.app' }),
      JSON.stringify(registryObservation),
      'Netlify url must be an HTTPS URL.',
    ],
    [
      'malformed observation',
      JSON.stringify(cliDeployment),
      '{',
      'Registry observation must be valid JSON.',
    ],
  ])(
    'rejects %s without writing an artifact',
    async (_label, deploymentJson, observationJson, message) => {
      const writeFileFn = jest.fn();
      await expect(
        main({
          argv: ['/runner/netlify.json', '/runner/observation.json'],
          readFileFn: jest
            .fn()
            .mockResolvedValueOnce(deploymentJson)
            .mockResolvedValueOnce(observationJson),
          writeFileFn,
          writeLine: jest.fn(),
        })
      ).rejects.toThrow(message);
      expect(writeFileFn).not.toHaveBeenCalled();
    }
  );

  it('updates the observation file and logs no deployment URLs', async () => {
    const writeFileFn = jest.fn().mockResolvedValue(undefined);
    const writeLine = jest.fn();
    await expect(
      main({
        argv: ['/runner/netlify.json', '/runner/observation.json'],
        readFileFn: jest
          .fn()
          .mockResolvedValueOnce(JSON.stringify(cliDeployment))
          .mockResolvedValueOnce(JSON.stringify(registryObservation)),
        writeFileFn,
        writeLine,
      })
    ).resolves.toBe(0);

    expect(writeFileFn).toHaveBeenCalledWith(
      '/runner/observation.json',
      expect.stringContaining('"deploymentId": "deploy-123"'),
      'utf8'
    );
    expect(writeLine).toHaveBeenCalledWith(
      'Attached Netlify deployment identity to registry observation.'
    );
    expect(writeLine.mock.calls.flat().join(' ')).not.toContain(
      'https://deploy-123--example.netlify.app'
    );
  });
});
