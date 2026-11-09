import { partitionTests } from '../src/logic/core/local/test-partitions.js';
import { parseTestShardSize } from '../src/logic/boundary/local/test-shard-size.js';

// Compile-only contract: every trusted call obtains a proven progress bound.
partitionTests(['test/core/a.test.js'], parseTestShardSize(2));
partitionTests(Object.freeze(['test/core/a.test.js']), parseTestShardSize(undefined));

// @ts-expect-error Raw positive literals have not passed the boundary.
partitionTests([], 2);
// @ts-expect-error Zero can make the trusted partition loop stop progressing.
partitionTests([], 0);
// @ts-expect-error Negative values are not proven progress bounds.
partitionTests([], -1);
// @ts-expect-error Arbitrary numeric values cannot cross the trusted API.
partitionTests([], Number.NaN);
