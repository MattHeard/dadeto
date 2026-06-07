import path from 'node:path';
import { describe, expect, it, afterAll, jest } from '@jest/globals';
import { ADMIN_UID } from '../../src/core/commonCore.js';
import { createLocalGcpSimulator } from '../../src/local/gcp-simulator/simulator.js';

let simulator;

afterAll(async () => {
  if (simulator) {
    await simulator.clear();
  }
});

describe('local gcp simulator', () => {
  it('uses the default simulator configuration when no overrides are provided', async () => {
    const defaultSimulator = await createLocalGcpSimulator();
    try {
      expect(defaultSimulator.baseUrl).toBe('http://127.0.0.1:4321');
      expect(defaultSimulator.publicDir).toBe(path.resolve('public'));
      expect(defaultSimulator.getConfig()).toMatchObject({
        submitNewStoryUrl: 'http://127.0.0.1:4321/__sim/submit-new-story',
        generateStatsUrl: 'http://127.0.0.1:4321/__sim/generate-stats',
      });
    } finally {
      await defaultSimulator.clear();
    }
  });

  it('seeds the fixture and renders the generated pages', async () => {
    simulator = await createLocalGcpSimulator({
      publicDir: path.resolve('public'),
      baseUrl: 'http://127.0.0.1:4322',
    });

    const indexFile = simulator.storage
      .bucket(simulator.bucketName)
      .file('index.html');
    const storyFile = simulator.storage
      .bucket(simulator.bucketName)
      .file('p/1a.html');
    const pendingFile = simulator.storage
      .bucket(simulator.bucketName)
      .file(`pending/${'gcp-test-fixture-story'}.json`);

    expect(await indexFile.exists()).toEqual([true]);
    expect(await storyFile.exists()).toEqual([true]);
    expect(await pendingFile.exists()).toEqual([true]);

    const [indexHtml] = await indexFile.download();
    expect(indexHtml.toString('utf8')).toContain('E2E moderation fixture story');
    expect(indexHtml.toString('utf8')).toContain('Contents');

    const [pendingJson] = await pendingFile.download();
    expect(JSON.parse(pendingJson.toString('utf8'))).toMatchObject({
      path: expect.stringMatching(/^p\/.+\.html$/),
    });
  });

  it('accepts a new story submission and refreshes contents locally', async () => {
    const response = await simulator.routes.submitNewStory({
      method: 'POST',
      body: {
        title: 'Simulator Story',
        content: 'Simulator body',
        author: 'Playwright',
        option0: 'Continue onward',
      },
      headers: { authorization: 'Bearer local-admin-token' },
      get: name =>
        name.toLowerCase() === 'authorization'
          ? 'Bearer local-admin-token'
          : null,
    });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');

    const submissionId = /** @type {{ id: string }} */ (response.body).id;
    const pendingFile = simulator.storage
      .bucket(simulator.bucketName)
      .file(`pending/${submissionId}.json`);
    const contentsFile = simulator.storage
      .bucket(simulator.bucketName)
      .file('index.html');

    expect(await pendingFile.exists()).toEqual([true]);

    const [contentsHtml] = await contentsFile.download();
    expect(contentsHtml.toString('utf8')).toContain('Simulator Story');
    expect(contentsHtml.toString('utf8')).toContain('Contents');
  });

  it('can regenerate stats from the simulated backend', async () => {
    await simulator.generateStatsCore.generate();

    const statsFile = simulator.storage
      .bucket(simulator.bucketName)
      .file('stats.html');
    expect(await statsFile.exists()).toEqual([true]);

    const [statsHtml] = await statsFile.download();
    expect(statsHtml.toString('utf8')).toContain('Number of stories:');
    expect(statsHtml.toString('utf8')).toContain('Number of pages:');
  });

  it('covers simulator failure paths for moderation and submission lookups', async () => {
    await expect(simulator.verifyIdToken('')).resolves.toEqual({ uid: null });

    const missingVariant = await simulator.routes.getModerationVariant({
      headers: {},
    });
    expect(missingVariant).toEqual({
      status: 401,
      body: 'Invalid or expired token',
    });

    const invalidIncomingOption = await simulator.routes.submitNewPage({
      body: {
        incoming_option: 'bad-option',
        content: 'Body',
        author: 'Playwright',
      },
      headers: { authorization: 'Bearer local-admin-token' },
    });
    expect(invalidIncomingOption).toEqual({
      status: 400,
      body: { error: 'invalid incoming option' },
    });

    const missingPage = await simulator.routes.submitNewPage({
      body: {
        page: '9999',
        content: 'Body',
        author: 'Playwright',
      },
      headers: { authorization: 'Bearer local-admin-token' },
    });
    expect(missingPage).toEqual({
      status: 400,
      body: { error: 'page not found' },
    });

    const exactTargetError = await simulator.routes.submitNewPage({
      body: {
        incoming_option: '1-a-0',
        page: '1',
        content: 'Body',
        author: 'Playwright',
      },
      headers: { authorization: 'Bearer local-admin-token' },
    });
    expect(exactTargetError).toEqual({
      status: 400,
      body: { error: 'must provide exactly one of incoming option or page' },
    });

    const validPage = await simulator.routes.submitNewPage({
      body: {
        page: '1',
        content: 'Page body',
        author: 'Playwright',
      },
      headers: { authorization: 'Bearer local-admin-token' },
    });
    expect(validPage.status).toBe(201);

    const blankAuthPageSubmission = await simulator.routes.submitNewPage({
      body: {
        page: '1',
        content: 'Page body',
        author: 'Playwright',
      },
      headers: { authorization: 'Bearer ' },
    });
    expect(blankAuthPageSubmission.status).toBe(201);
    expect(blankAuthPageSubmission.body.authorId).toBeNull();

    await simulator.db.doc('stories/gone/pages/9/variants/x').delete();

    const missingAuthRating = await simulator.routes.submitModerationRating({
      body: { isApproved: true },
      headers: {},
    });
    expect(missingAuthRating).toEqual({
      status: 401,
      body: 'Invalid or expired token',
    });

    const invalidRating = await simulator.routes.submitModerationRating({
      body: { isApproved: 'maybe' },
      headers: { authorization: 'Bearer local-admin-token' },
    });
    expect(invalidRating).toEqual({
      status: 400,
      body: 'Missing or invalid isApproved',
    });

    await simulator.db.collection('moderators').doc(ADMIN_UID).set({
      variant: 'stories/missing/pages/1/variants/a',
      createdAt: new Date(),
    });
    await expect(
      simulator.routes.submitModerationRating({
        body: { isApproved: true },
        headers: { authorization: 'Bearer local-admin-token' },
      })
    ).rejects.toThrow(
      'Cannot update missing document: stories/missing/pages/1/variants/a'
    );

    await simulator.db.collection('moderators').doc(ADMIN_UID).update({
      variant: simulator.fieldValue.delete(),
    });
    const missingAssignmentRating = await simulator.routes.submitModerationRating({
      body: { isApproved: true },
      headers: { authorization: 'Bearer local-admin-token' },
    });
    expect(missingAssignmentRating).toEqual({
      status: 404,
      body: 'Variant not found',
    });

    await simulator.db.collection('moderators').doc(ADMIN_UID).set({
      variant: 'stories/gcp-test-fixture-story/pages/1/variants/a',
      createdAt: new Date(),
    });
    await simulator.db
      .doc('stories/gcp-test-fixture-story/pages/1/variants/a/options/extra')
      .set({
        content: 'Extra path',
        position: 1,
        targetPage: simulator.db.doc(
          'stories/gcp-test-fixture-story/pages/2/variants/a'
        ),
      });
    await simulator.db
      .doc('stories/gcp-test-fixture-story/pages/1/variants/a/options/continue')
      .update({
        targetPage: simulator.fieldValue.delete(),
      });
    const missingTargetPageInfo = await simulator.routes.getModerationVariant({
      headers: { authorization: 'Bearer local-admin-token' },
    });
    expect(missingTargetPageInfo.status).toBe(200);
    expect(missingTargetPageInfo.body.options[0].targetPageNumber).toBeUndefined();

    await simulator.db.collection('moderators').doc(ADMIN_UID).set({
      variant: 'stories/missing/pages/1/variants/a',
      createdAt: new Date(),
    });
    const missingGetVariant = await simulator.routes.getModerationVariant({
      headers: { authorization: 'Bearer local-admin-token' },
    });
    expect(missingGetVariant).toEqual({
      status: 404,
      body: 'Variant not found',
    });

    await simulator.db
      .collectionGroup('variants')
      .get()
      .then(snapshot =>
        Promise.all(
          snapshot.docs.map(doc =>
            doc.ref.update({
              moderatorReputationSum: 1,
            })
          )
        )
      );
    const noJobAvailable = await simulator.routes.assignModerationJob({
      body: {},
      headers: { authorization: 'Bearer local-admin-token' },
    });
    expect(noJobAvailable).toEqual({
      status: 404,
      body: 'Variant not found',
    });

    const missingPageMark = await simulator.routes.markVariantDirty({
      body: { pageNumber: 9999, variantName: 'a' },
      headers: {},
    });
    expect(missingPageMark).toEqual({
      status: 404,
      body: 'Page not found',
    });

    const missingVariantMark = await simulator.routes.markVariantDirty({
      body: { pageNumber: 1, variantName: 'missing' },
      headers: {},
    });
    expect(missingVariantMark).toEqual({
      status: 404,
      body: 'Variant not found',
    });

    const missingNameMark = await simulator.routes.markVariantDirty({
      body: { pageNumber: 1, variantName: '' },
      headers: {},
    });
    expect(missingNameMark).toEqual({
      status: 400,
      body: 'Missing pageNumber or variantName',
    });

    const missingOptionSubmission = await simulator.routes.submitNewPage({
      body: {
        incoming_option: '1-a-99',
        content: 'Body',
        author: 'Playwright',
      },
      headers: { authorization: 'Bearer local-admin-token' },
    });
    expect(missingOptionSubmission).toEqual({
      status: 400,
      body: { error: 'incoming option not found' },
    });

    const missingVariantSubmission = await simulator.routes.submitNewPage({
      body: {
        incoming_option: '1-z-0',
        content: 'Body',
        author: 'Playwright',
      },
      headers: { authorization: 'Bearer local-admin-token' },
    });
    expect(missingVariantSubmission).toEqual({
      status: 400,
      body: { error: 'incoming option not found' },
    });

    await simulator.db
      .doc('stories/gcp-test-fixture-story/pages/1/variants/a')
      .delete();
  });

  it('covers simulator helper branches that are only used in edge cases', async () => {
    const { testUtils } = simulator;

    expect(
      testUtils.extractParams('stories/{storyId}/pages/{pageId}', 'stories/1')
    ).toBeNull();
    expect(
      testUtils.matchesTrigger(
        'stories/{storyId}/pages/{pageId}',
        'stories/1'
      )
    ).toBe(false);
    expect(testUtils.resolveTargetPageNumber({})).toBeUndefined();
    expect(
      testUtils.createSnapshot('stories/missing', undefined)
    ).toMatchObject({
      exists: false,
      id: 'missing',
    });
    expect(
      testUtils.createSnapshot('stories/missing', undefined).data()
    ).toBeUndefined();
    simulator.db.__setPathData('manual/story', {
      title: 'Story',
    });
    expect(
      testUtils.createSnapshot('manual/story', {
        title: 'Ignored',
      }).data()
    ).toMatchObject({ title: 'Story' });

    await simulator.dispatchCommittedWrites([
      {
        path: 'stories/gcp-test-fixture-story/pages/1/variants/a',
        before: undefined,
        after: undefined,
      },
    ]);

    await simulator.db
      .collection('moderators')
      .doc(ADMIN_UID)
      .set({
        createdAt: new Date(),
      });

    const missingVariantResponse = await simulator.routes.getModerationVariant({
      headers: { authorization: 'Bearer local-admin-token' },
    });
    expect(missingVariantResponse).toEqual({
      status: 404,
      body: 'Variant not found',
    });

    const noAuthAssignment = await simulator.routes.assignModerationJob({
      body: {},
      headers: {},
    });
    expect(noAuthAssignment).toEqual({
      status: 401,
      body: 'Invalid or expired token',
    });

    const noAuthPageSubmission = await simulator.routes.submitNewPage({
      body: {
        page: '1',
        content: 'Page body',
        author: 'Playwright',
      },
      headers: {},
    });
    expect(noAuthPageSubmission.status).toBe(201);
    expect(noAuthPageSubmission.body.authorId).toBeNull();

    const blankAuthStorySubmission = await simulator.routes.submitNewStory({
      method: 'POST',
      body: {
        title: 'Blank auth story',
        content: 'Story body',
        author: 'Playwright',
      },
      headers: { authorization: 'Bearer ' },
      get: name =>
        name.toLowerCase() === 'authorization' ? 'Bearer ' : undefined,
    });
    expect(blankAuthStorySubmission.status).toBe(201);
    expect(blankAuthStorySubmission.body).toMatchObject({
      title: 'Blank auth story',
      author: 'Playwright',
    });

    expect(await testUtils.findExistingOptionPath(null)).toBeNull();
    expect(
      await testUtils.findExistingOptionPath({
        pageNumber: 1,
        variantName: 'a',
      })
    ).toBeNull();
    expect(
      await testUtils.findExistingOptionPath({
        pageNumber: 9999,
        variantName: 'a',
        optionNumber: 0,
      })
    ).toBeNull();

    const localFetch = testUtils.createLocalFetchStub();
    const localResponse = await localFetch();
    expect(await localResponse.json()).toEqual({
      access_token: 'local-access-token',
    });
    expect(await localResponse.text()).toBe('');
    expect(
      await testUtils.generateStatsVerifyIdToken('local-admin-token')
    ).toEqual({ uid: ADMIN_UID, token: 'local-admin-token' });
    expect(
      await testUtils.generateStatsVerifyIdToken('')
    ).toEqual({ uid: null });
    expect(
      await testUtils.submitNewPageVerifyIdToken('local-admin-token')
    ).toEqual({ uid: ADMIN_UID });
    expect(await testUtils.submitNewPageVerifyIdToken('')).toEqual({
      uid: null,
    });
    expect(
      await testUtils.submitNewStoryVerifyIdToken('local-admin-token')
    ).toEqual({ uid: ADMIN_UID });
    expect(await testUtils.submitNewStoryVerifyIdToken('')).toEqual({
      uid: null,
    });
    expect(await simulator.verifyIdToken('local-admin-token')).toEqual({
      uid: ADMIN_UID,
      token: 'local-admin-token',
    });
    expect(await simulator.verifyIdToken('')).toEqual({ uid: null });
    expect(
      testUtils.resolveTargetPageNumber({
        path: '/stories/gcp-test-fixture-story/pages/2',
      })
    ).toBe(2);
    expect(testUtils.resolveTargetPageNumber({})).toBeUndefined();

    const mockRes = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      json: jest.fn(),
      end: jest.fn(),
    };
    await simulator.generateStatsCore.handleRequest(
      {
        method: 'POST',
        headers: { authorization: 'Bearer ' },
        get: name =>
          name.toLowerCase() === 'authorization' ? 'Bearer ' : undefined,
      },
      mockRes
    );
    expect(mockRes.status).toHaveBeenCalledWith(401);
  });

  it('covers simulator success paths that the failure-only loop missed', async () => {
    const localSimulator = await createLocalGcpSimulator({
      baseUrl: 'http://127.0.0.1:4323',
      publicDir: path.resolve('public'),
    });

    try {
      const assigned = await localSimulator.routes.assignModerationJob({
        body: {},
        headers: { authorization: 'Bearer local-admin-token' },
      });
      expect(assigned).toEqual({
        status: 201,
        body: { ok: true },
      });

      const noBodyMark = await localSimulator.routes.markVariantDirty({
        headers: {},
      });
      expect(noBodyMark).toEqual({
        status: 400,
        body: 'Missing pageNumber or variantName',
      });

      const validIncomingOption = await localSimulator.routes.submitNewPage({
        body: {
          incoming_option: '1-a-0',
          content: 'Follow-on body',
          author: 'Playwright',
        },
        headers: { authorization: 'Bearer local-admin-token' },
      });
      expect(validIncomingOption.status).toBe(201);

      const storyId = 'fallback-story';
      const storyRef = localSimulator.db.collection('stories').doc(storyId);
      const pageOneRef = storyRef.collection('pages').doc('1');
      const pageTwoRef = storyRef.collection('pages').doc('2');
      const variantRef = pageOneRef.collection('variants').doc('a');

      localSimulator.db.__setPathData(storyRef.path, {
        rootPage: pageOneRef,
      });
      localSimulator.db.__setPathData(pageOneRef.path, {
        number: 1,
      });
      localSimulator.db.__setPathData(pageTwoRef.path, {
        number: 2,
      });
      localSimulator.db.__setPathData(variantRef.path, {
        moderatorReputationSum: 2,
        moderationRatingCount: 1,
      });
      localSimulator.db.__setPathData(variantRef.collection('options').doc('alpha').path, {
        content: 'Alpha choice',
        targetPage: pageTwoRef,
      });
      localSimulator.db.__setPathData(variantRef.collection('options').doc('beta').path, {
        content: 'Beta choice',
        targetPage: pageTwoRef,
      });

      await localSimulator.db.collection('moderators').doc(ADMIN_UID).set({
        variant: variantRef.path,
        createdAt: new Date(),
      });

      const fallbackVariant = await localSimulator.routes.getModerationVariant({
        headers: { authorization: 'Bearer local-admin-token' },
      });
      expect(fallbackVariant.status).toBe(200);
      expect(fallbackVariant.body).toMatchObject({
        title: storyId,
        author: '',
        content: '',
        pageNumber: 1,
      });
      expect(
        fallbackVariant.body.options.map(option => option.targetPageNumber)
      ).toEqual([2, 2]);
      expect(
        fallbackVariant.body.options.map(option => option.content).sort()
      ).toEqual(['Alpha choice', 'Beta choice']);

      await localSimulator.db.collection('moderators').doc(ADMIN_UID).set({
        variant: 'stories/gcp-test-fixture-story/pages/1/variants/a',
        createdAt: new Date(),
      });

      const noBodyRating = await localSimulator.routes.submitModerationRating({
        headers: { authorization: 'Bearer local-admin-token' },
      });
      expect(noBodyRating).toEqual({
        status: 400,
        body: 'Missing or invalid isApproved',
      });

      const rejectedRating = await localSimulator.routes.submitModerationRating({
        body: { isApproved: false },
        headers: { authorization: 'Bearer local-admin-token' },
      });
      expect(rejectedRating).toEqual({
        status: 200,
        body: { ok: true },
      });

      const rejectedVariant = await localSimulator.db
        .doc('stories/gcp-test-fixture-story/pages/1/variants/a')
        .get();
      expect(rejectedVariant.data()).toMatchObject({
        moderatorReputationSum: 0,
        moderationRatingCount: 2,
      });

      await localSimulator.db.collection('moderators').doc(ADMIN_UID).set({
        variant: 'stories/gcp-test-fixture-story/pages/1/variants/a',
        createdAt: new Date(),
      });

      const approvedRating = await localSimulator.routes.submitModerationRating({
        body: { isApproved: true },
        headers: { authorization: 'Bearer local-admin-token' },
      });
      expect(approvedRating).toEqual({
        status: 200,
        body: { ok: true },
      });

      const approvedVariant = await localSimulator.db
        .doc('stories/gcp-test-fixture-story/pages/1/variants/a')
        .get();
      expect(approvedVariant.data()).toMatchObject({
        moderatorReputationSum: 1,
        moderationRatingCount: 3,
      });

      const successfulMarkDirty = await localSimulator.routes.markVariantDirty({
        body: { pageNumber: 1, variantName: 'a' },
        headers: {},
      });
      expect(successfulMarkDirty).toEqual({
        status: 200,
        body: { ok: true },
      });
    } finally {
      await localSimulator.clear();
    }
  });
});
