# Jest cache recovery

If Jest or mutation runs stall and system memory or I/O pressure is elevated,
inspect `/tmp/jest_rs`. It is generated Jest state and can be safely cleared
with:

```bash
find /tmp/jest_rs -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +
```

Jest recreates the cache on the next run. Recheck `free -h`, `vmstat`, and
`df -h /tmp` afterward; do not clear swap unless pressure remains and the
operation has been explicitly authorized.
