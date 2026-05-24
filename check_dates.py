import re
from collections import Counter

filepath = "WhatsApp Chat with Fawcett Wordlers.txt"

# Match anything that looks like a header with different date formats
generic_header = re.compile(r"^([\d/]+), \d{2}:\d{2} - (.*?):")

date_formats = Counter()
mismatched_lines = []

with open(filepath, 'r', encoding='utf-8') as f:
    for line in f:
        match = generic_header.match(line)
        if match:
            date_str = match.group(1)
            # Try to see the pattern of the date
            parts = date_str.split('/')
            pattern = "/".join(str(len(p)) for p in parts)
            date_formats[pattern] += 1
            if pattern != "2/2/4":
                mismatched_lines.append((line.strip(), pattern))

print("Date formats found (number of digits in parts separated by /):")
for fmt, count in date_formats.items():
    print(f"  {fmt}: {count} occurrences")

if mismatched_lines:
    print(f"\nMismatched lines (first 10):")
    for line, fmt in mismatched_lines[:10]:
        print(f"  {fmt}: {line}")
else:
    print("\nAll headers have the 2/2/4 (DD/MM/YYYY) format.")
