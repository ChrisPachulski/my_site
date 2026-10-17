---
title: >-
  R - Trading Card Market Analytics and Automated Reporting: A Comprehensive
  Breakdown
date: 2017-01-08T05:00:00.000Z
featureImage: /R_logo_resized.png
---

Efficiently managing and analyzing market data is crucial, particularly in niche markets like trading card analytics. The R script ([rewrite.R](https://github.com/ChrisPachulski/mines_of_moria/blob/main/cronR/rewrite.R)) provides sophisticated automated processing by combining extensive data extraction, detailed transformations, complex comparative analyses, and comprehensive reporting. Here, we'll thoroughly explore each of its functionalities in a structured and detailed manner with precise explanations and illustrative code examples.

***

## Overview of the Script’s Functionality

This script automates retrieval, processing, and analysis of trading card market data, focusing extensively on price fluctuations, seller activity, and retail comparisons between platforms such as Card Kingdom and TCGPlayer.

***

## Detailed Breakdown of Core Functionalities

### 1. Setup and Dependencies

The script leverages the pacman library for streamlined package management, loading libraries essential for data manipulation, web interactions, and database integrations:

```r
pacman::p_load(
  tidyverse, dplyr, janitor,   # Data manipulation and cleaning
  rvest, jsonlite, curl,       # Web scraping and API interactions
  googlesheets4, googledrive,  # Google Sheets integration
  bigrquery,                   # BigQuery database integration
  RSelenium                    # Browser automation
)
```

### 2. Authentication and Connection to BigQuery

The script securely connects to Google's BigQuery database, providing robust capabilities to query extensive historical datasets:

```r
con <- gaeas_cradle()
```

### 3. Historical Data Extraction from BigQuery

The script retrieves detailed historical datasets from BigQuery, focusing on buylist prices, seller data, and rankings over a rolling three-week period:

```r
statement <- paste(
  "SELECT Key, BL, Sellers, TCG_Rank, CK_ADJ_Rank, Date",
  "FROM `gaeas-cradle.premiums.*`",
  "WHERE _TABLE_SUFFIX BETWEEN",
  "FORMAT_DATE('%Y_%m_%d', DATE_SUB(CURRENT_DATE(), INTERVAL 22 DAY))",
  "AND FORMAT_DATE('%Y_%m_%d', DATE_SUB(CURRENT_DATE(), INTERVAL -1 DAY))",
  "ORDER BY DATE", sep = " "
)

temporary_data_hub <- dbSendQuery(con, statement) %>% dbFetch(n = -1)
```

### 4. Automated Data Structuring (tracker\_creation function)

The script organizes raw extracted data by appending key card attributes (Name, Set, Rarity, Foil) to create structured, analysis-ready datasets:

```r
tracker_creation <- function(tracker) {
  tracker %>% mutate(
    Name = Updated_Tracking_Keys$name[match(Key, Updated_Tracking_Keys$Key)],
    Set = Updated_Tracking_Keys$Set[match(Key, Updated_Tracking_Keys$Key)],
    Rarity = Updated_Tracking_Keys$Rarity[match(Key, Updated_Tracking_Keys$Key)],
    Foil = Updated_Tracking_Keys$Foil[match(Key, Updated_Tracking_Keys$Key)]
  ) %>% replace_na(list(Foil = ""))
}
```

### 5. Market Trend Analysis (prior\_3\_weeks function)

Analyzes daily changes across 7, 15, and 21-day periods, converting these trends into clear binary indicators (+1, 0, -1) to reflect increases, stability, or decreases:

```r
prior_3_weeks <- function(tracker) {
  # Binary indicators for daily changes (simplified illustration)
  Binary_Form <- ifelse(New > 0, 1, ifelse(New < 0, -1, 0))
  Final <- tracker %>% mutate(
    Rank_Sums = rowSums(Binary_Form),
    Rank_Groups = as.numeric(as.factor(Rank_Sums))
  )
  Final
}
```

### 6. Comparative Analysis Across Metrics

Identifies top-performing cards by aggregating upper-tier market changes (Buylist, Vendors, TCGPlayer, Card Kingdom):

```r
Combined_Upper_Esch <- bind_rows(BL_Upper_Esch, VEN_Upper_Esch, TCG_Upper_Esch, CK_Upper_Esch)
Unique_Combined_Upper_Esch <- distinct(Combined_Upper_Esch)
```

### 7. Weighted Scoring and Comprehensive Ranking

Employs a weighted mean score (WMS) for nuanced ranking across multiple KPIs:

```r
OVR_KPI_DF <- Unique_Combined_Upper_Esch %>% mutate(
  # Weights sum to 1, so this is the per-row weighted mean
  WMS = 0.35 * BL_Bracket + 0.47 * VEN_Bracket + 0.15 * TCG_Bracket + 0.03 * CK_Bracket
) %>% arrange(WMS)
```

### 8. Google Sheets & BigQuery Integration

The processed data and insights are seamlessly exported to Google Sheets and BigQuery for easy access, historical tracking, and collaborative reporting:

```r
sheet_write(OVR_KPI_DF, ss = ss, sheet = "Master")
bq_table_upload(x = mybq, values = OVR_KPI_DF)
```

### 9. Price Comparison: Card Kingdom vs. TCGPlayer

Retrieves and analyzes two months of historical retail pricing data, pinpointing significant price movements and rankings:

```r
CK_Retail_Comparison <- CK_Market__Tracker - TCG_Market_Tracker
```

### 10. Real-Time Inventory & Pricing API Integration

Integrates Card Kingdom's real-time inventory and buylist offers via their API, significantly enriching market analytics:

```r
CK_Inv <- fromJSON("https://api.cardkingdom.com/api/pricelist") %>% as.data.frame()
```

### 11. Detailed Market Reporting

Generates comprehensive reports combining market performance metrics with real-time inventory and buylist data, exported for immediate analysis and archiving:

```r
sheet_write(Market_Comparison, ss = ss, sheet = "Market_Comparisons")
bq_table_upload(x=mybq, values = Comparison_Export)
```

***

## Summary of Practical Value and Technical Complexity

This script is an advanced analytical tool, automating the ingestion, transformation, and reporting of complex trading card market data. It significantly reduces manual analysis while enhancing precision and insight, offering an essential solution for market participants aiming for data-driven decision-making in trading card analytics.
