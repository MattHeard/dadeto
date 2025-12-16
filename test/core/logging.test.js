import { jest } from '@jest/globals';
import {
  createPrefixedLogger,
  createPrefixedLoggers,
} from '../../src/core/browser/browser-core.js';

describe('logging helpers', () => {
  describe('createPrefixedLogger', () => {
    it('forwards messages to the provided logger with a prefix', () => {
      const logger = jest.fn();
      const prefixed = createPrefixedLogger(logger, '[core]');

      prefixed('first', 'second');

      expect(logger).toHaveBeenCalledWith('[core]', 'first', 'second');
    });

    it('returns a no-op when the logger is not provided', () => {
      const prefixed = createPrefixedLogger(null, '[core]');

      expect(() => prefixed('message')).not.toThrow();
    });
  });

  describe('createPrefixedLoggers', () => {
    it('creates prefixed variants for each logger function', () => {
      const loggers = {
        logInfo: jest.fn(),
        logError: jest.fn(),
        logWarning: jest.fn(),
      };

      const prefixed = createPrefixedLoggers(loggers, '[prefix]');

      prefixed.logInfo('info');
      prefixed.logError('error');
      prefixed.logWarning('warn');

      expect(loggers.logInfo).toHaveBeenCalledWith('[prefix]', 'info');
      expect(loggers.logError).toHaveBeenCalledWith('[prefix]', 'error');
      expect(loggers.logWarning).toHaveBeenCalledWith('[prefix]', 'warn');
    });
  });
});
