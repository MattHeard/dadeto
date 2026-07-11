# sendBeacon JSON transport

- Unexpected hurdle: the shared reporter assumed every transport returned a Promise, but `navigator.sendBeacon` returns a boolean.
- Diagnosis: passing a fetch RequestInit object to sendBeacon produced a malformed request and a `.catch is not a function` error.
- Fix: add a dedicated Blob-backed `sendBeacon` reporter and use it for the admin entrypoint.
- Next time: keep fetch and sendBeacon transports separate because their request and completion contracts differ.
