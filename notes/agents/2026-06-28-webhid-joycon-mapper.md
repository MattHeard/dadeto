Unexpected hurdle: the first WebHID attempt landed in a toy, but the toy layer should stay source-agnostic.

Diagnosis: the Joy-Con mapper already owns controller capture and snapshot polling, so it is the right place to normalize HID reports into the same internal snapshot shape.

Chosen fix: added WebHID grant/device listeners and report decoding in `joyConMapper.js`, plus focused coverage for listener setup, report decoding, and snapshot normalization.

Next time: keep hardware-source adapters in the browser/input layer and only feed toys the normalized controller snapshot they already expect.
