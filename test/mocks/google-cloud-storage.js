import { jest } from '@jest/globals';

export const mockSave = jest.fn();
export const mockFile = jest.fn(() => ({ save: mockSave }));
export const mockBucket = jest.fn(() => ({ file: mockFile }));

export class Storage {
  bucket(...args) {
    return mockBucket(...args);
  }
}
