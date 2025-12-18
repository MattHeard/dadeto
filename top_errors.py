import re
import collections

# Path to the log file
log_file = '/Users/matthew.heard/Code/Matt/dadeto/tsdoc-check-output.txt'

# Regular expression to match TypeScript errors
# Example: src/core/browser/admin-core.js(93,5): error TS2345: ...
error_pattern = re.compile(r'^(src/core/.*?)\(\d+,\d+\): error')

errors_by_file = collections.Counter()

with open(log_file, 'r') as f:
    for line in f:
        match = error_pattern.search(line)
        if match:
            file_path = match.group(1)
            errors_by_file[file_path] += 1

print("--- Top 10 Files with Most Errors in src/core ---")
for file_path, count in errors_by_file.most_common(10):
    print(f"{file_path}: {count}")
