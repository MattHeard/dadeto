import re
import collections

# Path to the log file
log_file = '/Users/matthew.heard/Code/Matt/dadeto/tsdoc-check-output.txt'

# Regular expression to match TypeScript errors
# Example: src/core/browser/admin-core.js(93,5): error TS2345: ...
error_pattern = re.compile(r'^(src/core/.*?): error (TS\d+):')

errors_by_type = collections.Counter()
errors_by_subdir = collections.Counter()

with open(log_file, 'r') as f:
    for line in f:
        match = error_pattern.search(line)
        if match:
            file_path = match.group(1)
            error_code = match.group(2)
            
            # Count error code
            errors_by_type[error_code] += 1
            
            # Extract subdirectory under src/core
            # path is src/core/subdir/...
            parts = file_path.split('/')
            if len(parts) >= 3:
                # Part 0: src
                # Part 1: core
                # Part 2: subdirectory
                subdir = parts[2]
                errors_by_subdir[subdir] += 1

print("--- Errors by Type ---")
for code, count in sorted(errors_by_type.items(), key=lambda x: x[1], reverse=True):
    print(f"{code}: {count}")

print("\n--- Errors by src/core Subdirectory ---")
for subdir, count in sorted(errors_by_subdir.items(), key=lambda x: x[1], reverse=True):
    print(f"{subdir}: {count}")
