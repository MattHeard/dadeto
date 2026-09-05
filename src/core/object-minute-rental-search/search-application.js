import { searchResult } from './search-core.js';

const DEFAULT_RUNNER_ID = 'RUNNER-1';

/**
 * Create the storage-agnostic object-minute search application.
 * @param {{runnerCommitmentsRepository: {listForRunner: (options: {runnerId: string}) => Promise<Array<{startTimestamp: string, endTimestamp: string}>>}, runnerId?: string}} options Application dependencies.
 * @returns {(request: object) => Promise<object>} Search application.
 */
export function createObjectMinuteRentalSearch({
  runnerCommitmentsRepository,
  runnerId = DEFAULT_RUNNER_ID,
}) {
  return async request => {
    const runnerCommitments = await runnerCommitmentsRepository.listForRunner({
      runnerId,
    });
    return searchResult({ ...request, runnerCommitments });
  };
}
