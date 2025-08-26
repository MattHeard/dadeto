import { jest } from '@jest/globals';

export const mockSave = jest.fn();
export const mockExists = jest.fn().mockResolvedValue([false]);
export const mockFile = jest.fn(() => ({ save: mockSave, exists: mockExists }));
export const mockBucket = jest.fn(() => ({ file: mockFile }));

export class Storage {
  bucket(...args) {
    return mockBucket(...args);
  }
}
