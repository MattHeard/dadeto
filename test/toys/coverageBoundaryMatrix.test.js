import { describe, expect, test } from '@jest/globals';
import { assetAllocationRegistry } from '../../src/core/browser/toys/2026-08-18/assetAllocationRegistry.js';
import { memoryObjectListAppend } from '../../src/core/browser/toys/2026-08-18/memoryObjectListAppend.js';
import { runnerAvailabilityRegistry } from '../../src/core/browser/toys/2026-08-18/runnerAvailabilityRegistry.js';
import { spacetimePointRegistry } from '../../src/core/browser/toys/2026-08-19/spacetimePointRegistry.js';
import { spacetimeSegmentDuration } from '../../src/core/browser/toys/2026-08-19/spacetimeSegmentDuration.js';
import { spacetimeSegmentGeodesicLength } from '../../src/core/browser/toys/2026-08-19/spacetimeSegmentGeodesicLength.js';
import { spacetimeSegmentRegistry } from '../../src/core/browser/toys/2026-08-19/spacetimeSegmentRegistry.js';
import { spacetimeSegmentTemporalRelation } from '../../src/core/browser/toys/2026-08-19/spacetimeSegmentTemporalRelation.js';
import { spacetimeWorldLine } from '../../src/core/browser/toys/2026-08-19/spacetimeWorldLine.js';
import { assetPossessionSegmentCandidateFilter } from '../../src/core/browser/toys/2026-08-20/assetPossessionSegmentCandidateFilter.js';
import { assetSegmentAssignmentPredicate } from '../../src/core/browser/toys/2026-08-20/assetSegmentAssignmentPredicate.js';
import { personSegmentAssignmentPredicate } from '../../src/core/browser/toys/2026-08-20/personSegmentAssignmentPredicate.js';
import { possessionContextRegistry } from '../../src/core/browser/toys/2026-08-20/possessionContextRegistry.js';
import { spacetimeWorldLinePairPredicate } from '../../src/core/browser/toys/2026-08-20/spacetimeWorldLinePairPredicate.js';
import { wgs84CirclePointPredicate } from '../../src/core/browser/toys/2026-08-20/wgs84CirclePointPredicate.js';
import { wgs84CircleSegmentPredicate } from '../../src/core/browser/toys/2026-08-20/wgs84CircleSegmentPredicate.js';
import { constantSpeedGeodesicTravelDuration } from '../../src/core/browser/toys/2026-08-20/constantSpeedGeodesicTravelDuration.js';
import { deliveryOutboundSegmentProposal } from '../../src/core/browser/toys/2026-08-20/deliveryOutboundSegmentProposal.js';
import { pickupReturnSegmentProposal } from '../../src/core/browser/toys/2026-08-20/pickupReturnSegmentProposal.js';
import { wgs84Distance } from '../../src/core/browser/toys/2026-08-20/wgs84Distance.js';
import { assetSegmentAssignmentList } from '../../src/core/browser/toys/2026-08-20/assetSegmentAssignmentList.js';
import { assetCustodianSegmentAssignmentList } from '../../src/core/browser/toys/2026-08-20/assetCustodianSegmentAssignmentList.js';
import { personSegmentAssignmentList } from '../../src/core/browser/toys/2026-08-20/personSegmentAssignmentList.js';

const inputs = [
  '',
  '{}',
  'null',
  '[]',
  '{"points":null,"segments":null}',
  '{"points":[],"segments":[],"assignments":[],"proposedAssignment":null}',
  '{"points":[{}],"segments":[{}],"assets":[null,{}],"circle":{}}',
  JSON.stringify({
    points: [
      { pointId: 'A', latitude: 0, longitude: 0, timestamp: 'bad' },
      {
        pointId: 'B',
        latitude: 1,
        longitude: 1,
        timestamp: '2026-01-01T01:00Z',
      },
    ],
    segments: [{ segmentId: 'AB', startPointId: 'A', endPointId: 'B' }],
    firstSegmentId: 'AB',
    secondSegmentId: 'missing',
    segment: { startPointId: 'A', endPointId: 'B' },
    speedKilometersPerHour: -1,
    travelDurationSeconds: -1,
  }),
];

const pureToys = [
  assetAllocationRegistry,
  runnerAvailabilityRegistry,
  spacetimePointRegistry,
  spacetimeSegmentDuration,
  spacetimeSegmentGeodesicLength,
  spacetimeSegmentRegistry,
  spacetimeSegmentTemporalRelation,
  spacetimeWorldLine,
  assetPossessionSegmentCandidateFilter,
  assetSegmentAssignmentPredicate,
  personSegmentAssignmentPredicate,
  possessionContextRegistry,
  spacetimeWorldLinePairPredicate,
  wgs84CirclePointPredicate,
  wgs84CircleSegmentPredicate,
  constantSpeedGeodesicTravelDuration,
  deliveryOutboundSegmentProposal,
  pickupReturnSegmentProposal,
];

/**
 * Create a minimal in-memory persistence environment.
 * @returns {Map<string, Function>} Persistence dependency map.
 */
function memoryEnv() {
  const state = { temporary: {} };
  let permanent = {};
  return new Map([
    ['getData', () => state],
    ['setLocalTemporaryData', next => Object.assign(state, next)],
    ['getLocalPermanentData', () => permanent],
    [
      'setLocalPermanentData',
      next => {
        permanent = next;
      },
    ],
  ]);
}

describe('dated toy boundary matrix', () => {
  test('covers valid registry and interval boundaries', () => {
    const points = [
      {
        pointId: 'A',
        latitude: 0,
        longitude: 0,
        timestamp: '2026-01-01T00:00:00Z',
      },
      {
        pointId: 'B',
        latitude: 0,
        longitude: 1,
        timestamp: '2026-01-01T01:00:00Z',
      },
      {
        pointId: 'C',
        latitude: 1,
        longitude: 1,
        timestamp: '2026-01-01T02:00:00Z',
      },
      {
        pointId: 'D',
        latitude: 1,
        longitude: 2,
        timestamp: '2026-01-01T03:00:00Z',
      },
    ];
    const segments = [
      { segmentId: 'AB', startPointId: 'A', endPointId: 'B' },
      { segmentId: 'BC', startPointId: 'B', endPointId: 'C' },
      { segmentId: 'CD', startPointId: 'C', endPointId: 'D' },
    ];
    const intervalInput = JSON.stringify({
      points,
      segments,
      firstSegmentId: 'AB',
      secondSegmentId: 'CD',
    });
    expect(
      JSON.parse(spacetimeSegmentTemporalRelation(intervalInput)).relation
    ).toBe('disjoint');
    expect(JSON.parse(spacetimeWorldLinePairPredicate(intervalInput))).toBe(
      true
    );
    expect(
      JSON.parse(
        spacetimeWorldLinePairPredicate(
          JSON.stringify({
            points,
            segments,
            firstSegmentId: 'AB',
            secondSegmentId: 'BC',
          })
        )
      )
    ).toBe(true);
    expect(
      JSON.parse(
        spacetimeSegmentTemporalRelation(
          JSON.stringify({
            points,
            segments,
            firstSegmentId: 'AB',
            secondSegmentId: 'BC',
          })
        )
      ).relation
    ).toBe('touching');
    expect(
      JSON.parse(
        spacetimeSegmentTemporalRelation(
          JSON.stringify({
            points,
            segments,
            firstSegmentId: 'BC',
            secondSegmentId: 'AB',
          })
        )
      ).relation
    ).toBe('touching');
    const overlappingSegments = [
      ...segments,
      { segmentId: 'AC', startPointId: 'A', endPointId: 'C' },
    ];
    expect(
      JSON.parse(
        spacetimeWorldLinePairPredicate(
          JSON.stringify({
            points,
            segments: overlappingSegments,
            firstSegmentId: 'AB',
            secondSegmentId: 'AC',
          })
        )
      )
    ).toBe(false);
    expect(
      JSON.parse(
        spacetimeSegmentTemporalRelation(
          JSON.stringify({
            points,
            segments: overlappingSegments,
            firstSegmentId: 'AB',
            secondSegmentId: 'AC',
          })
        )
      ).relation
    ).toBe('overlapping');
    expect(
      JSON.parse(
        spacetimeSegmentDuration(
          JSON.stringify({ points, segment: segments[0] })
        )
      ).unit
    ).toBe('seconds');
    expect(
      JSON.parse(
        spacetimeSegmentGeodesicLength(
          JSON.stringify({ points, segment: segments[0] })
        )
      ).unit
    ).toBe('meters');
    const antipodalPoints = [
      {
        pointId: 'P',
        latitude: 0,
        longitude: 0,
        timestamp: points[0].timestamp,
      },
      {
        pointId: 'Q',
        latitude: 0,
        longitude: 180,
        timestamp: points[1].timestamp,
      },
    ];
    const antipodalResult = JSON.parse(
      spacetimeSegmentGeodesicLength(
        JSON.stringify({
          points: antipodalPoints,
          segment: { startPointId: 'P', endPointId: 'Q' },
        })
      )
    );
    expect(antipodalResult.unit).toBe('meters');
    expect(
      JSON.parse(
        constantSpeedGeodesicTravelDuration(
          JSON.stringify({
            points,
            segment: segments[0],
            speedKilometersPerHour: 30,
          })
        )
      ).unit
    ).toBe('seconds');
    expect(
      JSON.parse(
        deliveryOutboundSegmentProposal(
          JSON.stringify({
            possessionStartPoint: points[2],
            origin: points[0],
            travelDurationSeconds: 60,
            startPointId: 'origin',
            segmentId: 'outbound',
          })
        )
      ).segment.segmentId
    ).toBe('outbound');
    expect(
      JSON.parse(
        pickupReturnSegmentProposal(
          JSON.stringify({
            possessionEndPoint: points[1],
            destination: points[2],
            travelDurationSeconds: 60,
            endPointId: 'destination',
            segmentId: 'return',
          })
        )
      ).segment.segmentId
    ).toBe('return');
    const badCoordinates = [{ ...points[0], latitude: 'bad' }, points[1]];
    expect(
      JSON.parse(
        constantSpeedGeodesicTravelDuration(
          JSON.stringify({
            points: badCoordinates,
            segment: segments[0],
            speedKilometersPerHour: 30,
          })
        )
      ).valid
    ).toBe(false);
    expect(
      JSON.parse(
        deliveryOutboundSegmentProposal(
          JSON.stringify({
            possessionStartPoint: points[2],
            origin: { latitude: 'bad', longitude: 0 },
            travelDurationSeconds: 60,
            startPointId: 'origin',
            segmentId: 'outbound',
          })
        )
      ).valid
    ).toBe(false);
    expect(
      JSON.parse(
        pickupReturnSegmentProposal(
          JSON.stringify({
            possessionEndPoint: points[1],
            destination: { latitude: 'bad', longitude: 0 },
            travelDurationSeconds: 60,
            endPointId: 'destination',
            segmentId: 'return',
          })
        )
      ).valid
    ).toBe(false);
    expect(
      JSON.parse(
        spacetimeWorldLine(
          JSON.stringify({ segments, startPointId: 'A', endPointId: 'D' })
        )
      ).segments
    ).toHaveLength(3);
    expect(
      JSON.parse(
        assetAllocationRegistry(
          JSON.stringify({
            allocations: [
              {
                possessionContextId: 'ctx',
                assetId: 'asset',
                allocatedFrom: 'A',
                allocatedTo: 'D',
                possessionFrom: 'A',
                possessionTo: 'D',
              },
            ],
          })
        )
      ).summary.allocationCount
    ).toBe(1);
    expect(
      JSON.parse(
        runnerAvailabilityRegistry(
          JSON.stringify({
            runners: [
              { name: 'Runner', availability: [{ from: 'A', to: 'D' }] },
            ],
          })
        )
      ).summary.runnerCount
    ).toBe(1);
    const registryPoints = points.map(point => ({
      ...point,
      timestamp: `${point.timestamp.slice(0, 16)}Z`,
    }));
    expect(
      JSON.parse(
        spacetimePointRegistry(JSON.stringify({ points: registryPoints }))
      ).summary.pointCount
    ).toBe(4);
    expect(
      JSON.parse(spacetimeSegmentRegistry(JSON.stringify({ segments }))).summary
        .segmentCount
    ).toBe(3);
    expect(
      JSON.parse(
        possessionContextRegistry(
          JSON.stringify({
            possessionContexts: [
              { possessionContextId: 'ctx', sku: 'sku', segmentId: 'AB' },
            ],
          })
        )
      ).summary.possessionContextCount
    ).toBe(1);
    for (const [toy, key] of [
      [assetAllocationRegistry, 'allocations'],
      [runnerAvailabilityRegistry, 'runners'],
      [spacetimePointRegistry, 'points'],
      [spacetimeSegmentRegistry, 'segments'],
      [possessionContextRegistry, 'possessionContexts'],
    ]) {
      expect(typeof toy(JSON.stringify({ [key]: [null, [], {}] }))).toBe(
        'string'
      );
    }
    expect(
      JSON.parse(
        assetPossessionSegmentCandidateFilter(
          JSON.stringify({
            points,
            segments,
            possessionSegmentId: 'AB',
            requestedSku: 'sku',
            assets: [{ assetId: 'asset', sku: 'sku' }],
            existingAssetAssignments: [{ assetId: 'other', segmentId: 'CD' }],
          })
        )
      )
    ).toEqual(['asset']);
    expect(
      JSON.parse(
        assetPossessionSegmentCandidateFilter(
          JSON.stringify({
            points,
            segments,
            possessionSegmentId: 'AB',
            requestedSku: 'sku',
          })
        )
      )
    ).toEqual([]);
    expect(
      JSON.parse(
        assetPossessionSegmentCandidateFilter(
          JSON.stringify({
            points: [{ pointId: 'A', timestamp: 'bad' }, points[1]],
            segments,
            possessionSegmentId: 'AB',
            requestedSku: 'sku',
            assets: [],
          })
        )
      )
    ).toEqual([]);
    expect(
      JSON.parse(
        assetPossessionSegmentCandidateFilter(
          JSON.stringify({
            points,
            segments: [
              { segmentId: 'bad', startPointId: 'missing', endPointId: 'B' },
            ],
            possessionSegmentId: 'bad',
            requestedSku: 'sku',
            assets: [],
          })
        )
      )
    ).toEqual([]);
    expect(
      JSON.parse(
        assetSegmentAssignmentPredicate(
          JSON.stringify({
            points,
            segments,
            assignments: [{ assetId: 'asset', segmentId: 'CD' }],
            proposedAssignment: { assetId: 'asset', segmentId: 'AB' },
          })
        )
      )
    ).toBe(true);
    expect(
      JSON.parse(
        personSegmentAssignmentPredicate(
          JSON.stringify({
            points,
            segments,
            assignments: [{ personId: 'person', segmentId: 'CD' }],
            proposedAssignment: { personId: 'person', segmentId: 'AB' },
          })
        )
      )
    ).toBe(true);
    const missingPointSegment = [
      { segmentId: 'bad', startPointId: 'missing', endPointId: 'B' },
    ];
    expect(
      assetSegmentAssignmentPredicate(
        JSON.stringify({
          points,
          segments: missingPointSegment,
          assignments: [],
          proposedAssignment: { assetId: 'asset', segmentId: 'bad' },
        })
      )
    ).toBe('false');
    expect(
      personSegmentAssignmentPredicate(
        JSON.stringify({
          points,
          segments: missingPointSegment,
          assignments: [],
          proposedAssignment: { personId: 'person', segmentId: 'bad' },
        })
      )
    ).toBe('false');
    const invalidTimePoints = [{ ...points[0], timestamp: 'bad' }, points[1]];
    expect(
      assetSegmentAssignmentPredicate(
        JSON.stringify({
          points: invalidTimePoints,
          segments: [{ segmentId: 'bad', startPointId: 'A', endPointId: 'B' }],
          assignments: [],
          proposedAssignment: { assetId: 'asset', segmentId: 'bad' },
        })
      )
    ).toBe('false');
    expect(
      personSegmentAssignmentPredicate(
        JSON.stringify({
          points: invalidTimePoints,
          segments: [{ segmentId: 'bad', startPointId: 'A', endPointId: 'B' }],
          assignments: [],
          proposedAssignment: { personId: 'person', segmentId: 'bad' },
        })
      )
    ).toBe('false');
    expect(
      spacetimeSegmentTemporalRelation(
        JSON.stringify({
          points,
          segments: missingPointSegment,
          firstSegmentId: 'bad',
          secondSegmentId: 'bad',
        })
      )
    ).toContain('unknown point');
    expect(
      spacetimeWorldLinePairPredicate(
        JSON.stringify({
          points,
          segments: missingPointSegment,
          firstSegmentId: 'bad',
          secondSegmentId: 'bad',
        })
      )
    ).toContain('unknown point');
  });

  test('exercises rejected record branches in dated collection toys', () => {
    const points = [
      {
        pointId: 'A',
        latitude: 0,
        longitude: 0,
        timestamp: '2026-01-01T00:00:00Z',
      },
      {
        pointId: 'B',
        latitude: 0,
        longitude: 0,
        timestamp: '2026-01-01T01:00:00Z',
      },
    ];
    const segments = [{ segmentId: 'AB', startPointId: 'A', endPointId: 'B' }];
    const cases = [
      [memoryObjectListAppend, { object: null, path: 'items' }],
      [
        assetPossessionSegmentCandidateFilter,
        { points, segments, possessionSegmentId: 'AB', assets: [null, [], {}] },
      ],
      [
        assetSegmentAssignmentPredicate,
        {
          points,
          segments: [null],
          assignments: [null],
          proposedAssignment: null,
        },
      ],
      [
        personSegmentAssignmentPredicate,
        {
          points,
          segments: [null],
          assignments: [null],
          proposedAssignment: null,
        },
      ],
      [
        spacetimeWorldLinePairPredicate,
        {
          points,
          segments: [null],
          firstSegmentId: 'AB',
          secondSegmentId: 'AB',
        },
      ],
      [
        spacetimeSegmentTemporalRelation,
        {
          points,
          segments: [null],
          firstSegmentId: 'AB',
          secondSegmentId: 'AB',
        },
      ],
      [
        spacetimeWorldLine,
        { segments: [null], startPointId: 'A', endPointId: 'B' },
      ],
    ];
    for (const [toy, input] of cases)
      expect(typeof toy(JSON.stringify(input), memoryEnv())).toBe('string');
    const throwingEnv = new Map([
      [
        'getData',
        () => {
          throw 'storage failure';
        },
      ],
      [
        'getLocalPermanentData',
        () => {
          throw 'storage failure';
        },
      ],
      ['setLocalTemporaryData', () => {}],
      ['setLocalPermanentData', () => {}],
    ]);
    for (const toy of [
      memoryObjectListAppend,
      assetSegmentAssignmentList,
      personSegmentAssignmentList,
    ]) {
      expect(
        typeof toy(
          JSON.stringify({
            path: 'items',
            memoryLocation: 'temporary',
            object: { id: 1 },
            assignment: {
              assetId: 'a',
              personId: 'p',
              segmentId: 's',
              custodianPersonId: 'p',
            },
          }),
          throwingEnv
        )
      ).toBe('string');
    }
    const nonListState = memoryEnv();
    nonListState.get('getData')().temporary.items = {};
    expect(
      JSON.parse(
        memoryObjectListAppend(
          JSON.stringify({ path: 'items', object: { id: 1 } }),
          nonListState
        )
      )
    ).toMatchObject({ appended: false });
    const nullDataEnv = new Map([
      ['getData', () => null],
      ['setLocalTemporaryData', () => {}],
      ['getLocalPermanentData', () => null],
      ['setLocalPermanentData', () => {}],
    ]);
    expect(
      typeof memoryObjectListAppend(
        JSON.stringify({ path: 'items', object: { id: 1 } }),
        nullDataEnv
      )
    ).toBe('string');
    expect(JSON.parse(memoryObjectListAppend('{}', memoryEnv()))).toMatchObject(
      { appended: false }
    );
    expect(
      typeof memoryObjectListAppend(
        JSON.stringify({
          memoryLocation: 'permanent',
          path: 'items',
          object: { id: 1 },
        }),
        nullDataEnv
      )
    ).toBe('string');
    expect(
      typeof assetSegmentAssignmentList(
        JSON.stringify({
          path: 'items',
          assignment: { assetId: 'a', segmentId: 's' },
        }),
        nullDataEnv
      )
    ).toBe('string');
    expect(
      typeof personSegmentAssignmentList(
        JSON.stringify({
          path: 'items',
          assignment: { personId: 'p', segmentId: 's' },
        }),
        nullDataEnv
      )
    ).toBe('string');
    expect(
      typeof assetSegmentAssignmentList(
        JSON.stringify({ assignment: { assetId: 'a', segmentId: 's' } }),
        nullDataEnv
      )
    ).toBe('string');
    expect(
      typeof personSegmentAssignmentList(
        JSON.stringify({ assignment: { personId: 'p', segmentId: 's' } }),
        nullDataEnv
      )
    ).toBe('string');
    expect(
      typeof assetCustodianSegmentAssignmentList(
        JSON.stringify({
          assignment: { assetId: 'a', segmentId: 's', custodianPersonId: 'p' },
        }),
        nullDataEnv
      )
    ).toBe('string');
  });

  test('all pure toys return their string contract for boundary inputs', () => {
    for (const toy of pureToys) {
      for (const input of inputs) {
        expect(typeof toy(input)).toBe('string');
      }
    }
    expect(Number.isFinite(wgs84Distance(0, 0, 0, 180))).toBe(true);
  });

  test('memory append accepts and rejects boundary requests without throwing', () => {
    for (const location of ['temporary', 'permanent', 'envelope', 'invalid']) {
      const result = memoryObjectListAppend(
        JSON.stringify({
          location,
          memoryLocation: location,
          path: 'items',
          object: { id: location },
        }),
        memoryEnv()
      );
      expect(typeof result).toBe('string');
    }
    for (const toy of [
      assetSegmentAssignmentList,
      personSegmentAssignmentList,
    ]) {
      for (const input of [
        '',
        '{}',
        'null',
        '[]',
        JSON.stringify({ path: 'items', assignment: {} }),
      ]) {
        expect(typeof toy(input, memoryEnv())).toBe('string');
      }
    }
  });
});
/* eslint max-lines-per-function: off, max-statements: off */
