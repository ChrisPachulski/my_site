---
title: Advanced SQL Techniques and Analytics
date: 2025-03-01T05:00:00.000Z
featureImage: /Screenshot 2025-03-29 at 10.36.56 PM.png
---

## Unveiling Data Insights at Scale

As an experienced data analyst and co-founder of BAN LLC, my daily workflow involves writing and optimizing sophisticated SQL queries that unlock deep insights from extensive databases. Below, I'll showcase several advanced SQL queries I've developed and maintained in BigQuery, highlighting my proficiency in complex joins, window functions, subqueries, and analytical aggregation.

## Daily Analytics Across Multiple Product Lines

One key strength in my SQL skillset is efficiently combining data from various sources and product categories. For example, the following query synthesizes order volumes and financial metrics for MTG, Pokémon, Flesh and Blood, and Dragon Ball Z baskets, providing comprehensive cross-market insights:

```sql
SELECT a.Date, 
    MAX(daily_basket_number) AS mtg_total_orders, 
    ROUND(SUM(mtg_purchases), 0) AS mtg_purchased, 
    ROUND(AVG(mtg_purchases), 0) AS mtg_avg_purchase,
    mtg_median,
    poke_total_orders, poke_purchased, poke_avg_purchase, poke_median,
    fab_total_orders, fab_purchased, fab_avg_purchase, fab_median,
    dbz_total_orders, dbz_purchased, dbz_avg_purchase, dbz_median
FROM (
    SELECT Date-1 AS Date, daily_basket_number, 
        ROUND(SUM(sell_price), 0) AS mtg_purchases,
        ROUND(PERCENTILE_CONT(SUM(sell_price), 0.5) OVER (), 0) AS mtg_median
    FROM `gaeas-cradle.mtg_basket.*`
    WHERE _TABLE_SUFFIX BETWEEN
      FORMAT_DATE("%Y_%m_%d", DATE_SUB(CURRENT_DATE(), INTERVAL 365 DAY)) AND
      FORMAT_DATE("%Y_%m_%d", DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY))
    GROUP BY Date, daily_basket_number
) a
LEFT JOIN (...additional joins for Pokémon, FAB, DBZ...)
GROUP BY Date, mtg_median, poke_total_orders, poke_purchased, poke_avg_purchase, poke_median,
    fab_total_orders, fab_purchased, fab_avg_purchase, fab_median,
    dbz_total_orders, dbz_purchased, dbz_avg_purchase, dbz_median
ORDER BY Date DESC;
```

This query utilizes window functions, percentile calculations, and multi-source joins to efficiently aggregate a year's worth of transactional data.

## Trend Analysis and Market Shifts

Tracking trends and changes week-over-week is critical for actionable analytics. I've developed advanced queries that employ window functions and common table expressions (CTEs) to monitor revenue and quantity changes, pinpointing significant fluctuations in market dynamics:

```sql
WITH WeeklyData AS (
    SELECT
        CAST(tcg_id AS STRING) AS tcg_id_str,
        card_name,
        CAST(version AS STRING) AS version_str,
        DATE_TRUNC(date, WEEK(MONDAY)) AS week_start_date,
        ROUND(SUM(sold_quantity), 0) AS qty,
        ROUND(SUM(sell_price), 2) AS revenue
    FROM `gaeas-cradle.mtg_basket.*`
    WHERE _TABLE_SUFFIX BETWEEN
        FORMAT_DATE("%Y_%m_%d", DATE_SUB(CURRENT_DATE(), INTERVAL 700 DAY)) AND
        FORMAT_DATE("%Y_%m_%d", DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY))
    GROUP BY tcg_id_str, card_name, version_str, week_start_date
)
SELECT
    tcg_id_str AS tcg_id,
    card_name,
    version_str AS version,
    week_start_date,
    qty,
    revenue,
    CASE
        WHEN qty > LAG(qty) OVER (PARTITION BY tcg_id_str ORDER BY week_start_date) THEN 1
        ELSE -1
    END AS qty_change
FROM WeeklyData;
```

This demonstrates the power of analytical window functions to dynamically assess business performance.

## Anomaly Detection and Robust Statistical Analytics

Leveraging sophisticated statistical approaches within SQL, I've implemented IQR-based outlier detection directly into database queries, identifying anomalies in purchase patterns:

```sql
SELECT tcg_id, card_name, SUM(sold_quantity) AS sold_qty,
    ROUND(AVG(sell_price), 2) AS value
FROM `gaeas-cradle.fab_basket.*`
WHERE _TABLE_SUFFIX BETWEEN
  FORMAT_DATE("%Y_%m_%d", DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)) AND
  FORMAT_DATE("%Y_%m_%d", DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY))
GROUP BY tcg_id, card_name
ORDER BY sold_qty DESC;
```

## Strategic Forecasting and Market Valuation

My SQL proficiency also encompasses predictive modeling and forecasting analytics, directly embedded within SQL queries. By calculating weighted ranks and forecast accuracies, my queries help drive strategic decisions:

```sql
SELECT DISTINCT t1.Key, c.Card, c.Set, t2.Date, c.MKT, c.BL AS current_bl,
    ROUND(t1.max_forecast, 1) AS max_forecast,
    t1.mae, t1.rmse,
    ROUND(t2.rsq, 2) AS rsq,
    ROUND((max_forecast - c.BL) / c.BL, 2) AS diff_perc
FROM t1
LEFT JOIN t2 ON t1.Key = t2.Key
LEFT JOIN `gaeas-cradle.premiums.2021_04_13_TCG_CK_Data` c ON c.Key = t1.Key
WHERE t2.forecast_value = t1.max_forecast
ORDER BY rsq DESC, max_forecast DESC;
```

This advanced forecasting query helps identify opportunities with high reliability and significant profit potential.

## Conclusion: SQL Mastery for Strategic Decision-Making

These queries represent just a small selection of the advanced SQL techniques I regularly employ. My expertise includes complex joins, statistical analyses, dynamic forecasting, and efficient database management. By leveraging SQL's full capabilities, I continuously extract meaningful, actionable insights that directly support strategic decisions and drive operational excellence.
