import { describe, expect, it } from '@jest/globals';
import { pickNextModerationVariant } from '../../../../src/core/local/gcp-simulator/simulator.js';

describe('pickNextModerationVariant', () => {
  it('falls back to collectionGroup queries when nested traversal is unavailable', async () => {
    const db = {
      collectionGroup: name => {
        if (name !== 'variants') {
          throw new Error(`Unexpected collectionGroup ${name}`);
        }

        return {
          where: () => ({
            get: async () => ({
              docs: [
                { ref: { path: 'stories/a/pages/1/variants/a' } },
                { ref: { path: 'stories/b/pages/1/variants/a' } },
              ],
            }),
          }),
        };
      },
    };

    await expect(
      pickNextModerationVariant(db, 'stories/a/pages/1/variants/a')
    ).resolves.toEqual({ ref: { path: 'stories/b/pages/1/variants/a' } });
  });

  it('returns null from the collectionGroup fallback when no alternate variant exists', async () => {
    const db = {
      collectionGroup: () => ({
        where: () => ({
          get: async () => ({
            docs: [{ ref: { path: 'stories/a/pages/1/variants/a' } }],
          }),
        }),
      }),
    };

    await expect(
      pickNextModerationVariant(db, 'stories/a/pages/1/variants/a')
    ).resolves.toBeNull();
  });

  it('prefers the oldest, then lowest rand, then lexical path candidate', async () => {
    const db = {
      collection: () => ({
        get: async () => ({
          docs: [
            {
              ref: {
                collection: collectionName => {
                  if (collectionName !== 'pages') {
                    return { get: async () => ({ docs: [] }) };
                  }

                  return {
                    get: async () => ({
                      docs: [
                        {
                          ref: {
                            collection: variantCollection => {
                              if (variantCollection !== 'variants') {
                                return { get: async () => ({ docs: [] }) };
                              }

                              return {
                                get: async () => ({
                                  docs: [
                                    {
                                      ref: {
                                        path: 'stories/a/pages/2/variants/a',
                                      },
                                      data: () => ({
                                        moderatorReputationSum: 0,
                                        createdAt: { toMillis: () => 20 },
                                        rand: 3,
                                      }),
                                    },
                                    {
                                      ref: {
                                        path: 'stories/a/pages/2/variants/b',
                                      },
                                      data: () => ({
                                        moderatorReputationSum: 0,
                                        createdAt: { toMillis: () => 10 },
                                        rand: 2,
                                      }),
                                    },
                                    {
                                      ref: {
                                        path: 'stories/a/pages/2/variants/c',
                                      },
                                      data: () => ({
                                        moderatorReputationSum: 0,
                                        createdAt: { toMillis: () => 10 },
                                        rand: 1,
                                      }),
                                    },
                                  ],
                                }),
                              };
                            },
                          },
                        },
                      ],
                    }),
                  };
                },
              },
            },
          ],
        }),
      }),
    };

    await expect(
      pickNextModerationVariant(db, 'stories/a/pages/2/variants/a')
    ).resolves.toMatchObject({
      ref: { path: 'stories/a/pages/2/variants/c' },
    });
  });

  it('uses createdAt first and lexicographic path as the final tie-breaker', async () => {
    const db = {
      collection: () => ({
        get: async () => ({
          docs: [
            {
              ref: {
                collection: collectionName => {
                  if (collectionName !== 'pages') {
                    return { get: async () => ({ docs: [] }) };
                  }

                  return {
                    get: async () => ({
                      docs: [
                        {
                          ref: {
                            collection: variantCollection => {
                              if (variantCollection !== 'variants') {
                                return { get: async () => ({ docs: [] }) };
                              }

                              return {
                                get: async () => ({
                                  docs: [
                                    {
                                      ref: {
                                        path: 'stories/a/pages/3/variants/b',
                                      },
                                      data: () => ({
                                        moderatorReputationSum: 0,
                                        createdAt: { toMillis: () => 5 },
                                        rand: 9,
                                      }),
                                    },
                                    {
                                      ref: {
                                        path: 'stories/a/pages/3/variants/a',
                                      },
                                      data: () => ({
                                        moderatorReputationSum: 0,
                                        createdAt: { toMillis: () => 5 },
                                        rand: 9,
                                      }),
                                    },
                                    {
                                      ref: {
                                        path: 'stories/a/pages/3/variants/c',
                                      },
                                      data: () => ({
                                        moderatorReputationSum: 0,
                                        createdAt: { toMillis: () => 1 },
                                        rand: 99,
                                      }),
                                    },
                                  ],
                                }),
                              };
                            },
                          },
                        },
                      ],
                    }),
                  };
                },
              },
            },
          ],
        }),
      }),
    };

    await expect(
      pickNextModerationVariant(db, 'stories/a/pages/3/variants/a')
    ).resolves.toMatchObject({
      ref: { path: 'stories/a/pages/3/variants/c' },
    });
  });

  it('uses lexical ordering when createdAt and rand are identical', async () => {
    const db = {
      collection: () => ({
        get: async () => ({
          docs: [
            {
              ref: {
                collection: collectionName => {
                  if (collectionName !== 'pages') {
                    return { get: async () => ({ docs: [] }) };
                  }

                  return {
                    get: async () => ({
                      docs: [
                        {
                          ref: {
                            collection: variantCollection => {
                              if (variantCollection !== 'variants') {
                                return { get: async () => ({ docs: [] }) };
                              }

                              return {
                                get: async () => ({
                                  docs: [
                                    {
                                      ref: {
                                        path: 'stories/a/pages/4/variants/b',
                                      },
                                      data: () => ({
                                        moderatorReputationSum: 0,
                                        createdAt: { toMillis: () => 5 },
                                        rand: 2,
                                      }),
                                    },
                                    {
                                      ref: {
                                        path: 'stories/a/pages/4/variants/a',
                                      },
                                      data: () => ({
                                        moderatorReputationSum: 0,
                                        createdAt: { toMillis: () => 5 },
                                        rand: 2,
                                      }),
                                    },
                                  ],
                                }),
                              };
                            },
                          },
                        },
                      ],
                    }),
                  };
                },
              },
            },
          ],
        }),
      }),
    };

    await expect(
      pickNextModerationVariant(db, 'stories/a/pages/4/variants/c')
    ).resolves.toMatchObject({
      ref: { path: 'stories/a/pages/4/variants/a' },
    });
  });

  it('treats missing variant data as empty and defaults rand to zero', async () => {
    const db = {
      collection: () => ({
        get: async () => ({
          docs: [
            {
              ref: {
                collection: collectionName => {
                  if (collectionName !== 'pages') {
                    return { get: async () => ({ docs: [] }) };
                  }

                  return {
                    get: async () => ({
                      docs: [
                        {
                          ref: {
                            collection: variantCollection => {
                              if (variantCollection !== 'variants') {
                                return { get: async () => ({ docs: [] }) };
                              }

                              return {
                                get: async () => ({
                                  docs: [
                                    {
                                      ref: {
                                        path: 'stories/a/pages/5/variants/b',
                                      },
                                    },
                                    {
                                      ref: {
                                        path: 'stories/a/pages/5/variants/a',
                                      },
                                      data: () => ({
                                        moderatorReputationSum: 0,
                                      }),
                                    },
                                  ],
                                }),
                              };
                            },
                          },
                        },
                      ],
                    }),
                  };
                },
              },
            },
          ],
        }),
      }),
    };

    await expect(
      pickNextModerationVariant(db, 'stories/a/pages/5/variants/c')
    ).resolves.toMatchObject({
      ref: { path: 'stories/a/pages/5/variants/a' },
    });
  });
});
