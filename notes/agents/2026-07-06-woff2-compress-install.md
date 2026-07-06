Unexpected hurdle: `woff2_compress` is not published on npm under either `woff2_compress` or `woff2-compress`.
Diagnosis: the repo already references `.woff2` assets, but the executable itself comes from the Debian `woff2` package on this machine.
Chosen fix: installed `woff2` via `apt`, which provides `/usr/bin/woff2_compress`.
Next time: check the system package name first when the request names a binary-style tool rather than a JS library.
