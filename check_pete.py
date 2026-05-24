import sys
sys.stdout.reconfigure(encoding='utf-8')

with open("WhatsApp Chat with Fawcett Wordlers.txt", "r", encoding="utf-8") as f:
    lines = f.readlines()

printed_indices = set()
for idx, line in enumerate(lines):
    if "29/09/2024" in line or "30/09/2024" in line:
        if idx in printed_indices:
            continue
        print(f"\n--- Line {idx+1} ---")
        start = max(0, idx-2)
        end = min(len(lines), idx+15)
        for i in range(start, end):
            printed_indices.add(i)
            print(f"{i+1}: {lines[i].strip()}")
