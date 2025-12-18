import re
import collections
import os

# Path to the log file
log_file = '/Users/matthew.heard/Code/Matt/dadeto/tsdoc-check-output.txt'

# Regular expression to match TypeScript errors
error_pattern = re.compile(r'^(src/core/browser/.*?): error (TS\d+):')

errors_by_browser_subdir = collections.Counter()

with open(log_file, 'r') as f:
    for line in f:
        match = error_pattern.search(line)
        if match:
            file_path = match.group(1)
            
            # Path is src/core/browser/...
            parts = file_path.split('/')
            # parts[0] = src
            # parts[1] = core
            # parts[2] = browser
            # if len(parts) == 4, it's a file directly in browser/
            # if len(parts) > 4, it's in a subdirectory
            
            if len(parts) == 4:
                errors_by_browser_subdir["(root)"] += 1
            elif len(parts) > 4:
                subdir = parts[3]
                errors_by_browser_subdir[subdir] += 1

print("--- Errors in src/core/browser by Subdirectory ---")
for subdir, count in sorted(errors_by_browser_subdir.items(), key=lambda x: x[1], reverse=True):
    print(f"{subdir}: {count}")
