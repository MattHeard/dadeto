import { createMergeSetter } from '../../utils/createMergeSetter.js';

export const setTemporary = createMergeSetter(
  'temporary',
  'Success: Temporary data deep merged.'
);
