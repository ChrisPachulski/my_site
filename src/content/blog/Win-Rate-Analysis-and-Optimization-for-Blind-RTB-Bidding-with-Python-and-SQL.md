---
title: Win Rate Analysis and Optimization for Blind RTB Bidding with Python and SQL
date: 2024-08-25T04:00:00.000Z
featureImage: /Python.svg_resized.png
---

In the competitive landscape of digital advertising, accurately analyzing and optimizing win rates in blind Real-Time Bidding (RTB) environments is essential for maximizing return on investment (ROI). Historically, advertisers have manually set bids based on intuition and experience. This advanced Python script addresses the need to automate bid discovery and optimization, leveraging sophisticated SQL queries and statistical modeling techniques to provide strategic, data-driven bidding recommendations. All details and identifiers are anonymized to ensure complete data privacy.

## Setting Up the Analytical Environment

Our workflow begins by initializing a robust Python environment to facilitate efficient data handling, statistical analysis, and visualization:

```python
import pandas as pd
import numpy as np
import statsmodels.api as sm
from sklearn.preprocessing import PolynomialFeatures
from sklearn.metrics import mean_squared_error
from sklearn.model_selection import KFold
import matplotlib.pyplot as plt
from database_driver import Client
```

These libraries are integral to executing complex data processing tasks, performing statistical analysis, and generating actionable insights.

## Precise Data Retrieval with SQL

The script initiates precise data extraction using well-crafted SQL queries to capture relevant advertising data:

```sql
SELECT *
FROM (
    SELECT advertiser_id, advertiser_name,
        ROUND(bid_price, 2) AS rounded_bid_price,
        countIf(event_type = 'ad_return') AS ad_returns,
        countIf(event_type = 'click') AS paid_clicks,
        SUM(revenue) AS bucket_revenue,
        SUM(SUM(revenue)) OVER (PARTITION BY advertiser_id) AS advertiser_revenue
    FROM {table_name}
    WHERE event_date BETWEEN '2024-06-01' AND '2024-06-30'
      AND event_type IN ('ad_return', 'click')
      AND traffic_integration_type IN ('XML', 'OpenRTB')
      AND advertiser_name NOT IN ('AnonymizedAdvertiser')
    GROUP BY advertiser_id, advertiser_name, rounded_bid_price
)
WHERE advertiser_revenue > 100
ORDER BY advertiser_revenue DESC, rounded_bid_price;
```

These SQL queries effectively aggregate revenue data to identify significant advertising opportunities for detailed analysis.

## Advanced Data Processing in Python

The Python script processes this data by filtering, calculating win rates, and implementing rigorous data cleaning:

```python
# Filtering relevant data
df_filtered = df[df['ad_returns'] >= 50].copy()

# Calculating win rate
df_filtered['win_rate'] = df_filtered['paid_clicks'] / df_filtered['ad_returns']
df_filtered['win_rate'] = np.minimum(df_filtered['win_rate'], 1)

# Handling outliers with the IQR method
cols = ['rounded_bid_price', 'win_rate']
Q1 = df_filtered[cols].quantile(0.25)
Q3 = df_filtered[cols].quantile(0.75)
IQR = Q3 - Q1

in_bounds = ((df_filtered[cols] >= Q1 - 1.5 * IQR) & (df_filtered[cols] <= Q3 + 1.5 * IQR)).all(axis=1)
df_filtered = df_filtered[in_bounds].copy()
```

These steps ensure robust and reliable data input for subsequent modeling.

## Statistical Modeling and Optimization

The script employs multiple statistical modeling techniques, including polynomial regression and cross-validation, to accurately predict win rates and determine optimal bidding strategies:

```python
# Five folds and curves up to degree 5 need enough buckets to stand on
if len(df_filtered) < 8 or df_filtered['rounded_bid_price'].nunique() < 6:
    raise ValueError("Not enough bid buckets left after filtering - widen the date range")

kf = KFold(n_splits=5, shuffle=True, random_state=42)
X = df_filtered[['rounded_bid_price']].to_numpy()
y = df_filtered['win_rate'].to_numpy()

# Polynomial degree selection on held-out folds
best_degree, best_mse = None, np.inf
for degree in range(2, 6):
    poly = PolynomialFeatures(degree=degree)
    X_poly = poly.fit_transform(X)
    fold_mse = []
    for train_idx, test_idx in kf.split(X_poly):
        fold_model = sm.OLS(y[train_idx], X_poly[train_idx]).fit()
        fold_mse.append(mean_squared_error(y[test_idx], fold_model.predict(X_poly[test_idx])))
    mse = np.mean(fold_mse)
    print(f"Degree {degree} CV MSE: {mse}")
    if mse < best_mse:
        best_degree, best_mse = degree, mse

# Refit the winning degree on all the data
poly = PolynomialFeatures(degree=best_degree)
model = sm.OLS(y, poly.fit_transform(X)).fit()
```

Cross-validation ensures the model's robustness, guiding strategic decisions based on predictive accuracy.

## Bid Increment Analysis for Enhanced Win Rates

An innovative feature of this script is its capability to dynamically calculate the required bid increment to achieve a specific increase in win rates, typically set at 10%:

```python
total_ad_returns = df_filtered['ad_returns'].sum()
current_win_rate = (df_filtered['win_rate'] * df_filtered['ad_returns']).sum() / total_ad_returns
target_win_rate = current_win_rate * 1.10
if target_win_rate > 1:
    raise ValueError(f"A 10% lift on a {current_win_rate:.1%} win rate is over 100% - nothing to bid toward")

increment = 0.01
max_iterations = 1000
iteration = 0

while iteration < max_iterations:
    df_filtered['adjusted_bid'] = df_filtered['rounded_bid_price'] + increment
    predicted_win_rate = np.clip(model.predict(poly.transform(df_filtered[['adjusted_bid']].to_numpy())), 0, 1)
    new_weighted_win_rate = (predicted_win_rate * df_filtered['ad_returns']).sum() / total_ad_returns

    if new_weighted_win_rate >= target_win_rate:
        print(f"Recommended bid increment: {increment:.2f}")
        break

    increment += 0.01
    iteration += 1
else:
    print(f"No increment in the search range reaches the {target_win_rate:.1%} target")
```

This methodology delivers precise, actionable recommendations for bidding strategy adjustments, automating the discovery of optimal bid values.

## Key Finding: Dramatic Win Rate Increases at Five-Cent Marks

A significant insight uncovered through this analysis was that win rates dramatically increased at bid increments aligning with five-cent marks. For example, transitioning bids from 4 cents to 5 cents or 24 cents to 25 cents resulted in substantial win rate jumps. This pattern highlights critical psychological and competitive pricing thresholds within blind RTB auctions, providing advertisers with strategic leverage points to optimize their bidding strategies.

## Visualization for Clear Strategic Insights

Clear, detailed visualizations provide stakeholders with easily interpretable insights into win rate dynamics and optimization recommendations:

```python
fig, ax = plt.subplots(figsize=(10, 6))
ax.scatter(df_filtered['rounded_bid_price'], df_filtered['win_rate'], color='blue', label='Actual Data')
bid_grid = np.sort(df_filtered['rounded_bid_price'].unique()).reshape(-1, 1)
ax.plot(bid_grid, model.predict(poly.transform(bid_grid)), color='red', label='Predicted Win Rate')

ax.set_xlabel('Bid Price')
ax.set_ylabel('Win Rate')
ax.set_title('Win Rate Analysis and Optimization')
ax.legend()
plt.grid(True)
plt.tight_layout()
plt.show()
```

Effective visualizations enhance the understanding and communication of complex analytical results.

## Practical Business Implications

Implementing this advanced analytical workflow provides several critical business advantages:

* **Enhanced Decision-Making:** Precise analytics empower informed strategic choices.
* **Improved ROI:** Optimized bid strategies directly impact profitability.
* **Operational Efficiency:** Automated analysis reduces manual workload and improves accuracy.
* **Adaptive Strategies:** Dynamic modeling accommodates evolving market conditions effectively.

## Conclusion

By combining sophisticated SQL data extraction, rigorous Python-based data processing, and advanced statistical modeling, organizations can significantly enhance their advertising performance through informed, data-driven bid optimization strategies. These automated techniques replace manual bid-setting methods, enabling businesses to continually adapt and thrive in competitive blind RTB bidding environments, all while maintaining strict data confidentiality.
