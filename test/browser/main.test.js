import { setupAudio } from '../../src/browser/audio-controls.js';
import { describe, test, expect, jest } from '@jest/globals';

// Mock DOM elements and functions
describe('setupAudio', () => {
  let mockDoc;
  let mockAudio;
  let mockAudioElements;
  let mockControlsContainer;
  let mockPlayButton;
  let mockPauseButton;
  let mockStopButton;
  let mockTimeDisplay;

  beforeEach(() => {
    // Mock document
    mockDoc = {
      querySelectorAll: jest.fn(),
      createElement: jest.fn(),
      createTextNode: jest.fn()
    };

    // Mock audio elements
    mockAudio = {
      id: '',
      removeAttribute: jest.fn(),
      play: jest.fn(),
      pause: jest.fn(),
      currentTime: 0
    };

    mockAudioElements = [mockAudio];
    mockDoc.querySelectorAll.mockReturnValue(mockAudioElements);

    // Mock DOM elements
    mockControlsContainer = {
      className: '',
      id: '',
      appendChild: jest.fn()
    };
    mockDoc.createElement.mockReturnValue(mockControlsContainer);

    mockPlayButton = {
      href: '#',
      textContent: '',
      addEventListener: jest.fn()
    };
    mockPauseButton = {
      href: '#',
      textContent: '',
      addEventListener: jest.fn()
    };
    mockStopButton = {
      href: '#',
      textContent: '',
      addEventListener: jest.fn()
    };
    mockTimeDisplay = {
      className: '',
      textContent: '',
      addEventListener: jest.fn()
    };
  });

  test('sets up audio controls correctly', () => {
    // Mock utility functions
    const mockGetAudioElements = jest.fn(() => mockAudioElements);
    const mockRemoveControlsAttribute = jest.fn();
    const mockCreateElement = jest.fn((doc, tag) => {
      if (tag === 'div') return mockControlsContainer;
      if (tag === 'a') return mockPlayButton;
      if (tag === 'span') return mockTimeDisplay;
    });
    const mockCreateTextNode = jest.fn();
    const mockStopDefault = jest.fn();
    const mockPlayAudio = jest.fn();
    const mockPauseAudio = jest.fn();
    const mockAddEventListener = jest.fn((element, event, func) => {
      if (element === mockPlayButton) {
        func = jest.fn();
      }
    });
    const mockAppendChild = jest.fn();
    const mockInsertBefore = jest.fn();

    // Call setupAudio
    setupAudio(
      mockDoc,
      mockGetAudioElements,
      mockRemoveControlsAttribute,
      mockCreateElement,
      mockCreateTextNode,
      mockStopDefault,
      mockPlayAudio,
      mockPauseAudio,
      mockAddEventListener,
      mockAppendChild,
      mockInsertBefore
    );
  });
});
