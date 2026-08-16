/**
 * ESLint compatibility entry point for the tautological-wrapper rule.
 * The AST analysis lives in the scripts boundary because it parses source
 * structure rather than validating runtime values.
 */
export {
  default,
  tautologicalWrapperTestOnly,
} from '../scripts/tautological-wrapper.js';
