import { searchResult, validatePossessionContextTime } from './search-core.js';

const DEFAULT_RUNNER_ID = 'RUNNER-1';

/**
 * Create the storage-agnostic object-minute search application.
 * @param {{runnerCommitmentsRepository: {listForRunner: (options: {runnerId: string}) => Promise<Array<{startTimestamp: string, endTimestamp: string}>>}, runnerId?: string}} options Application dependencies.
 * @returns {(request: {deliveryPoint?: {timestamp?: string}, pickupPoint?: {timestamp?: string}, [key: string]: unknown}) => Promise<object>} Search application.
 */
export function createObjectMinuteRentalSearch({
  runnerCommitmentsRepository,
  runnerId = DEFAULT_RUNNER_ID,
}) {
  return async request => {
    const temporalValidity = validatePossessionContextTime({
      startPoint: request.deliveryPoint,
      endPoint: request.pickupPoint,
    });
    if (!temporalValidity.valid) throw new Error(temporalValidity.reason);
    const runnerCommitments = await runnerCommitmentsRepository.listForRunner({
      runnerId,
    });
    return searchResult({ ...request, runnerCommitments });
  };
}
