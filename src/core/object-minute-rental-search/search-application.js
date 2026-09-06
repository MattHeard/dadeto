import { searchResult, validatePossessionContextTime } from './search-core.js';
import { evaluateServiceAreaFeasibility } from './service-area.js';

const DEFAULT_RUNNER_ID = 'RUNNER-1';

/**
 * Create the storage-agnostic object-minute search application.
 * @param {{runnerCommitmentsRepository: {listForRunner: (options: {runnerId: string}) => Promise<Array<{startTimestamp: string, endTimestamp: string}>>}, runnerId?: string, serviceArea: object}} options Application dependencies.
 * @returns {(request: {deliveryPoint?: {timestamp?: string}, pickupPoint?: {timestamp?: string}, [key: string]: unknown}) => Promise<object>} Search application.
 */
export function createObjectMinuteRentalSearch({
  runnerCommitmentsRepository,
  runnerId = DEFAULT_RUNNER_ID,
  serviceArea,
}) {
  return async request => {
    const temporalValidity = validatePossessionContextTime({
      startPoint: request.deliveryPoint,
      endPoint: request.pickupPoint,
    });
    if (!temporalValidity.valid) throw new Error(temporalValidity.reason);
    const spatialFeasibility = evaluateServiceAreaFeasibility({
      deliveryPoint: request.deliveryPoint,
      pickupPoint: request.pickupPoint,
      serviceArea,
    });
    if (!spatialFeasibility.valid) throw new Error(spatialFeasibility.reason);
    if (!spatialFeasibility.feasible) return { valid: true, results: [] };
    const runnerCommitments = await runnerCommitmentsRepository.listForRunner({
      runnerId,
    });
    return searchResult({ ...request, runnerCommitments });
  };
}
