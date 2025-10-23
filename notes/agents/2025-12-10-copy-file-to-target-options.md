# Copy file options lint fix

- Wrapped the cloud copy helper parameters in a single options object to satisfy the max-params rule without altering log output.
- Cleaned up trailing commas that eslint/prettier complained about while keeping the existing Promise.all structure readable.
