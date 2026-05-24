import json
from collections import Counter, defaultdict
from datetime import datetime

with open("wordle_scores.json", "r", encoding="utf-8") as f:
    data = json.load(f)

print(f"Total extracted scores: {len(data)}")

# Gather stats
by_user = defaultdict(list)
dates = []
scores_dist = defaultdict(Counter)
duplicates_by_user = defaultdict(Counter)

for entry in data:
    user = entry["name"]
    date_str = entry["date"]
    score = entry["score"]
    
    by_user[user].append(entry)
    dates.append(date_str)
    scores_dist[user][score] += 1

# Check for duplicate scores on the same day per user
for user, entries in by_user.items():
    date_counts = Counter(e["date"] for e in entries)
    for date, count in date_counts.items():
        if count > 1:
            duplicates_by_user[user][date] = count

min_date = min(dates) if dates else None
max_date = max(dates) if dates else None

print(f"\nDate Range: {min_date} to {max_date}")

print("\nScores Count and Averages by User:")
for user, entries in by_user.items():
    total_games = len(entries)
    numeric_scores = [e["score"] for e in entries if isinstance(e["score"], int)]
    x_count = sum(1 for e in entries if e["score"] == "X")
    
    avg_score = sum(numeric_scores) / len(numeric_scores) if numeric_scores else 0
    
    print(f"  {user:10}: {total_games:4} scores. Average (excl. X): {avg_score:.3f}. Failures (X): {x_count}")
    print("    Dist:")
    for val in [1, 2, 3, 4, 5, 6, "X"]:
        count = scores_dist[user][val]
        pct = (count / total_games) * 100
        print(f"      {val}: {count:4} ({pct:5.1f}%)")

print("\nDuplicate dates per user:")
for user, dups in duplicates_by_user.items():
    print(f"  {user}: {len(dups)} dates with multiple scores")
    if len(dups) > 0:
        # Show first 3 duplicate dates and their entries
        sample_dates = list(dups.keys())[:3]
        for d in sample_dates:
            matching = [e for e in by_user[user] if e["date"] == d]
            print(f"    {d}: {matching}")
