import json
import math
from collections import defaultdict
from datetime import datetime

# Load data
with open("wordle_scores.json", "r", encoding="utf-8") as f:
    data = json.load(f)

# Group by month (YYYY-MM) and calculate average score (excluding X)
monthly_scores = defaultdict(list)
for entry in data:
    if entry["score"] == "X":
        continue
    month = entry["date"][:7] # YYYY-MM
    monthly_scores[month].append(entry["score"])

# Sort months
sorted_months = sorted(monthly_scores.keys())
monthly_averages = []
for m in sorted_months:
    scores = monthly_scores[m]
    avg = sum(scores) / len(scores)
    monthly_averages.append((m, avg, len(scores)))

print("Monthly Averages (First 5 and Last 5):")
for m, avg, count in monthly_averages[:5]:
    print(f"  {m}: {avg:.4f} (n={count})")
print("  ...")
for m, avg, count in monthly_averages[-5:]:
    print(f"  {m}: {avg:.4f} (n={count})")

# 1. Compute Autocorrelation Function (ACF) for lags 1 to 15
series = [avg for m, avg, count in monthly_averages]
N = len(series)
mean_series = sum(series) / N
variance = sum((x - mean_series)**2 for x in series)

print(f"\nSeries Length: {N} months")
print(f"Overall Mean of Monthly Averages: {mean_series:.4f}")
print(f"Variance: {variance/N:.6f}")

print("\nAutocorrelation Function (ACF) by Lag:")
acf_results = {}
for lag in range(1, 16):
    if lag >= N:
        break
    numerator = 0
    for t in range(N - lag):
        numerator += (series[t] - mean_series) * (series[t + lag] - mean_series)
    r_k = numerator / variance
    acf_results[lag] = r_k
    # 95% confidence interval for white noise is approx +/- 2 / sqrt(N)
    ci = 2 / math.sqrt(N)
    sig_str = " *SIGNIFICANT*" if abs(r_k) > ci else ""
    print(f"  Lag {lag:2}: {r_k:8.4f}  (95% CI: +/-{ci:.4f}){sig_str}")

# 2. Seasonality: Group by Month of Year (01=Jan, 02=Feb, etc.)
month_of_year_scores = defaultdict(list)
for entry in data:
    if entry["score"] == "X":
        continue
    mo = entry["date"][5:7] # MM
    month_of_year_scores[mo].append(entry["score"])

month_names = {
    "01": "January", "02": "February", "03": "March", "04": "April",
    "05": "May", "06": "June", "07": "July", "08": "August",
    "09": "September", "10": "October", "11": "November", "12": "December"
}

print("\nAverages by Month of Year (Across all years):")
monthly_summary = []
for mo in sorted(month_of_year_scores.keys()):
    scores = month_of_year_scores[mo]
    avg = sum(scores) / len(scores)
    monthly_summary.append((mo, avg, len(scores)))
    print(f"  {month_names[mo]:9}: {avg:.4f} (n={len(scores)})")

# Calculate max difference between months
avgs = [avg for mo, avg, count in monthly_summary]
max_avg = max(avgs)
min_avg = min(avgs)
max_month = [month_names[mo] for mo, avg, count in monthly_summary if avg == max_avg][0]
min_month = [month_names[mo] for mo, avg, count in monthly_summary if avg == min_avg][0]
print(f"\nSeasonal Range: {min_avg:.4f} ({min_month}) to {max_avg:.4f} ({max_month}) -> Diff: {max_avg - min_avg:.4f}")

# 3. Check for specific players
print("\nPlayer-Specific Autocorrelation (Lag 1 and Lag 12):")
for player in ["Donald", "Ian", "John", "Steve", "Pete"]:
    player_monthly = defaultdict(list)
    for entry in data:
        if entry["name"] == player and entry["score"] != "X":
            m = entry["date"][:7]
            player_monthly[m].append(entry["score"])
    
    # We filter to months where the player has at least 5 games
    p_months = sorted([m for m, scs in player_monthly.items() if len(scs) >= 5])
    p_series = [sum(player_monthly[m])/len(player_monthly[m]) for m in p_months]
    pN = len(p_series)
    if pN < 15:
        continue
    p_mean = sum(p_series) / pN
    p_var = sum((x - p_mean)**2 for x in p_series)
    
    def get_acf(p_ser, mean, var, lag):
        num = sum((p_ser[t] - mean) * (p_ser[t + lag] - mean) for t in range(len(p_ser) - lag))
        return num / var if var > 0 else 0

    r1 = get_acf(p_series, p_mean, p_var, 1)
    r12 = get_acf(p_series, p_mean, p_var, 12) if pN > 12 else 0
    print(f"  {player:7}: Months={pN:2}, Lag 1 ACF = {r1:7.4f}, Lag 12 ACF = {r12:7.4f}")
