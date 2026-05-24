import json
import numpy as np
import pandas as pd
import scipy.stats as stats

# Load data
with open("wordle_scores.json", "r", encoding="utf-8") as f:
    data = json.load(f)

# Filter out failures (X) for score analysis
df = pd.DataFrame([e for e in data if e["score"] != "X"])
df["score"] = df["score"].astype(int)

# Add month of year (MM) and Season
df["month"] = df["date"].str.slice(5, 7) # '01' to '12'

def get_season(date_str):
    m = int(date_str[5:7])
    if m in [12, 1, 2]:
        return "Winter"
    elif m in [3, 4, 5]:
        return "Spring"
    elif m in [6, 7, 8]:
        return "Summer"
    else:
        return "Autumn"

df["season"] = df["date"].apply(get_season)

print("=== 1. ONE-WAY ANOVA BY MONTH OF YEAR PER PLAYER ===")
print("Testing if each player's average score varies significantly across the 12 months:")
for player in sorted(df["name"].unique()):
    p_df = df[df["name"] == player]
    groups = [p_df[p_df["month"] == m]["score"].values for m in sorted(p_df["month"].unique())]
    # Filter out empty months
    groups = [g for g in groups if len(g) > 0]
    
    if len(groups) < 2:
        print(f"  {player:7}: Not enough data")
        continue
        
    f_stat, p_val = stats.f_oneway(*groups)
    sig_str = " *SIGNIFICANT* (p < 0.05)" if p_val < 0.05 else " Not Significant"
    print(f"  {player:7}: F={f_stat:6.3f}, p-value={p_val:8.5f} ({sig_str})")

print("\n=== 2. ONE-WAY ANOVA BY SEASON PER PLAYER ===")
print("Testing if each player's average score varies significantly across the 4 seasons:")
for player in sorted(df["name"].unique()):
    p_df = df[df["name"] == player]
    groups = [p_df[p_df["season"] == s]["score"].values for s in ["Winter", "Spring", "Summer", "Autumn"]]
    groups = [g for g in groups if len(g) > 0]
    
    if len(groups) < 2:
        print(f"  {player:7}: Not enough data")
        continue
        
    f_stat, p_val = stats.f_oneway(*groups)
    sig_str = " *SIGNIFICANT* (p < 0.05)" if p_val < 0.05 else " Not Significant"
    print(f"  {player:7}: F={f_stat:6.3f}, p-value={p_val:8.5f} ({sig_str})")

# 3. Two-Way ANOVA for Unbalanced Design
# We fit linear regression models to compute Type III Sum of Squares for:
# - Player (main effect)
# - Season (main effect)
# - Player * Season (interaction effect)

def fit_model(X, y):
    # Fit linear regression using numpy.linalg.lstsq
    # X is a matrix of dummy variables (with intercept), y is scores vector
    beta, residuals, rank, s = np.linalg.lstsq(X, y, rcond=None)
    ssr = residuals[0] if len(residuals) > 0 else np.sum((y - np.dot(X, beta))**2)
    return ssr, len(beta)

print("\n=== 3. TWO-WAY ANOVA: INTERACTION EFFECT (PLAYER * SEASON) ===")
# Prepare dummy variables for Player and Season
# We drop one dummy variable for each factor to avoid multicollinearity (or use pinv/lstsq which handles it, but dropping is standard)
players = sorted(df["name"].unique())
seasons = ["Winter", "Spring", "Summer", "Autumn"]

# Construct design matrices
N = len(df)
y = df["score"].values

# Base Intercept
intercept = np.ones((N, 1))

# Player dummies (minus one reference)
player_dummies = np.zeros((N, len(players) - 1))
for i, p in enumerate(players[:-1]):
    player_dummies[:, i] = (df["name"] == p).astype(float)

# Season dummies (minus one reference)
season_dummies = np.zeros((N, len(seasons) - 1))
for i, s in enumerate(seasons[:-1]):
    season_dummies[:, i] = (df["season"] == s).astype(float)

# Interaction dummies
interaction_dummies = []
for p_idx, p in enumerate(players[:-1]):
    for s_idx, s in enumerate(seasons[:-1]):
        inter = ((df["name"] == p) & (df["season"] == s)).astype(float).values
        interaction_dummies.append(inter)
interaction_dummies = np.column_stack(interaction_dummies)

# Fit Models
# 1. Full Model: Intercept + Player + Season + Interaction
X_full = np.column_stack([intercept, player_dummies, season_dummies, interaction_dummies])
ssr_full, k_full = fit_model(X_full, y)
df_full = N - k_full

# 2. Reduced Model (No Interaction): Intercept + Player + Season
X_no_inter = np.column_stack([intercept, player_dummies, season_dummies])
ssr_no_inter, k_no_inter = fit_model(X_no_inter, y)
df_no_inter = N - k_no_inter

# 3. Model with Player Only: Intercept + Player
X_player_only = np.column_stack([intercept, player_dummies])
ssr_player_only, k_player_only = fit_model(X_player_only, y)

# 4. Model with Season Only: Intercept + Season
X_season_only = np.column_stack([intercept, season_dummies])
ssr_season_only, k_season_only = fit_model(X_season_only, y)

# F-test for Interaction term
df_num_inter = df_no_inter - df_full
f_inter = ((ssr_no_inter - ssr_full) / df_num_inter) / (ssr_full / df_full)
p_inter = 1 - stats.f.cdf(f_inter, df_num_inter, df_full)

# F-test for Season main effect (controlling for Player)
df_num_season = ssr_player_only - ssr_no_inter
f_season = (df_num_season / (k_no_inter - k_player_only)) / (ssr_no_inter / df_no_inter)
p_season = 1 - stats.f.cdf(f_season, k_no_inter - k_player_only, df_no_inter)

# F-test for Player main effect (controlling for Season)
df_num_player = ssr_season_only - ssr_no_inter
f_player = (df_num_player / (k_no_inter - k_season_only)) / (ssr_no_inter / df_no_inter)
p_player = 1 - stats.f.cdf(f_player, k_no_inter - k_season_only, df_no_inter)

print(f"Main Effect (Player): F={f_player:.3f}, p-value={p_player:.8f} " + ("*SIGNIFICANT*" if p_player < 0.05 else "Not Significant"))
print(f"Main Effect (Season): F={f_season:.3f}, p-value={p_season:.8f} " + ("*SIGNIFICANT*" if p_season < 0.05 else "Not Significant"))
print(f"Interaction (Player * Season): F={f_inter:.3f}, p-value={p_inter:.5f} " + ("*SIGNIFICANT*" if p_inter < 0.05 else "Not Significant"))

print("\n=== Summary Interpretation ===")
if p_inter >= 0.05:
    print("The interaction effect is NOT statistically significant (p = {:.3f}).".format(p_inter))
    print("This means that all players experience the same seasonal patterns (e.g. the summer slump).")
    print("The differences in scores from season to season do not vary significantly from player to player.")
else:
    print("The interaction effect IS statistically significant (p = {:.5f}).".format(p_inter))
    print("This means that seasonality affects players differently. Some players might have a much worse summer slump than others.")

# Print Seasonal Averages for players to inspect
pivot = df.pivot_table(index="name", columns="season", values="score", aggfunc="mean")
# Reorder columns
pivot = pivot[["Winter", "Spring", "Summer", "Autumn"]]
print("\nSeasonal Averages by Player:")
print(pivot.round(3))
print("\nDifference between Summer and Winter for each player:")
print((pivot["Summer"] - pivot["Winter"]).round(3))
