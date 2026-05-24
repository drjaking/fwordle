import re
from collections import Counter

filepath = "WhatsApp Chat with Fawcett Wordlers.txt"

header_pattern = re.compile(r"^(\d{2}/\d{2}/\d{4}), \d{2}:\d{2} - (.*?):")
wordle_pattern = re.compile(r"Wordle [\d,]+ ([1-6X])/6")

total_lines = 0
headers_count = 0
wordle_matches = 0
senders = Counter()
wordle_by_sender = Counter()

current_sender = None

with open(filepath, 'r', encoding='utf-8') as f:
    for line in f:
        total_lines += 1
        header_match = header_pattern.match(line)
        if header_match:
            headers_count += 1
            current_sender = header_match.group(2)
            senders[current_sender] += 1
        
        wordle_match = wordle_pattern.search(line)
        if wordle_match:
            wordle_matches += 1
            if current_sender:
                wordle_by_sender[current_sender] += 1
            else:
                wordle_by_sender["UNKNOWN"] += 1

print(f"Total lines: {total_lines}")
print(f"Total headers: {headers_count}")
print(f"Total Wordle matches in text: {wordle_matches}")
print("\nTop 15 Senders:")
for sender, count in senders.most_common(15):
    print(f"  {sender}: {count} messages")

print("\nWordle matches by sender:")
for sender, count in wordle_by_sender.most_common():
    print(f"  {sender}: {count} wordles")
