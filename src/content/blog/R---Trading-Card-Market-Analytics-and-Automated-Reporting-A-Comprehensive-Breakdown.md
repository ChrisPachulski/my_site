---
title: >-
  R - Trading Card Market Analytics and Automated Reporting: A Comprehensive
  Breakdown
date: 2017-01-08T05:00:00.000Z
featureImage: /R_logo_resized.png
---

Efficiently managing and analyzing market data is crucial, particularly in niche markets like trading card analytics. The R script ([rewrite.R](https://github.com/ChrisPachulski/mines_of_moria/blob/main/cronR/rewrite.R)) provides sophisticated automated processing by combining extensive data extraction, detailed transformations, complex comparative analyses, and comprehensive reporting. Here, we'll thoroughly explore each of its functionalities in a structured and detailed manner with precise explanations and illustrative code examples.

***

### Overview of the Script’s Functionality

This script automates retrieval, processing, and analysis of trading card market data, focusing extensively on price fluctuations, seller activity, and retail comparisons between platforms such as Card Kingdom and TCGPlayer.

***

### Detailed Breakdown of Core Functionalities

#### 1. Setup and Dependencies

The script leverages the pacman library for streamlined package management, loading libraries essential for data manipulation, web interactions, and database integrations:

pacman::p\_load(
tidyverse, dplyr, janitor,      # Data manipulation and cleaning
rvest, jsonlite, curl,          # Web scraping and API interactions
googlesheets4, googledrive,     # Google Sheets integration
bigrquery,                      # BigQuery database integration
RSelenium                       # Browser automation
)

#### 2. Authentication and Connection to BigQuery

The script securely connects to Google's BigQuery database, providing robust capabilities to query extensive historical datasets:

con \<- gaeas\_cradle()

#### 3. Historical Data Extraction from BigQuery

The script retrieves detailed historical datasets from BigQuery, focusing on buylist prices, seller data, and rankings over a rolling three-week period:

statement \<- paste(
"SELECT Key, BL, Sellers, TCG\_Rank, CK\_ADJ\_Rank, Date",
"FROM \`gaeas-cradle.premiums.\*\`",
"WHERE \_TABLE\_SUFFIX BETWEEN",
"FORMAT\_DATE('%Y\_%m\_%d', DATE\_SUB(CURRENT\_DATE(), INTERVAL 22 DAY))",
"AND FORMAT\_DATE('%Y\_%m\_%d', DATE\_SUB(CURRENT\_DATE(), INTERVAL -1 DAY))",
"ORDER BY DATE", sep = " "
)

temporary\_data\_hub \<- dbSendQuery(con, statement) %>% dbFetch(n = -1)

#### 4. Automated Data Structuring (tracker\_creation function)

The script organizes raw extracted data by appending key card attributes (Name, Set, Rarity, Foil) to create structured, analysis-ready datasets:

tracker\_creation \<- function(tracker) {
tracker %>% mutate(
Name = Updated\_Tracking\_Keys$name\[match(Key, Updated\_Tracking\_Keys$Key)],
Set = Updated\_Tracking\_Keys$Set\[match(Key, Updated\_Tracking\_Keys$Key)],
Rarity = Updated\_Tracking\_Keys$Rarity\[match(Key, Updated\_Tracking\_Keys$Key)],
Foil = Updated\_Tracking\_Keys$Foil\[match(Key, Updated\_Tracking\_Keys$Key)]
) %>% replace\_na(list(Foil = ""))
}

#### 5. Market Trend Analysis (prior\_3\_weeks function)

Analyzes daily changes across 7, 15, and 21-day periods, converting these trends into clear binary indicators (+1, 0, -1) to reflect increases, stability, or decreases:

prior\_3\_weeks \<- function(tracker) {
\# Binary indicators for daily changes (simplified illustration)
Binary\_Form \<- ifelse(New > 0, 1, ifelse(New \< 0, -1, 0))
Final \<- tracker %>% mutate(
Rank\_Sums = rowSums(Binary\_Form),
Rank\_Groups = as.numeric(as.factor(Rank\_Sums))
)
Final
}

#### 6. Comparative Analysis Across Metrics

Identifies top-performing cards by aggregating upper-tier market changes (Buylist, Vendors, TCGPlayer, Card Kingdom):

Combined\_Upper\_Esch \<- bind\_rows(BL\_Upper\_Esch, VEN\_Upper\_Esch, TCG\_Upper\_Esch, CK\_Upper\_Esch)
Unique\_Combined\_Upper\_Esch \<- distinct(Combined\_Upper\_Esch)

#### 7. Weighted Scoring and Comprehensive Ranking

Employs a weighted mean score (WMS) for nuanced ranking across multiple KPIs:

OVR\_KPI\_DF \<- Unique\_Combined\_Upper\_Esch %>% mutate(
WMS = weighted.mean(c(BL\_Bracket, VEN\_Bracket, TCG\_Bracket, CK\_Bracket),
c(0.35, 0.47, 0.15, 0.03))
) %>% arrange(WMS)

#### 8. Google Sheets & BigQuery Integration

The processed data and insights are seamlessly exported to Google Sheets and BigQuery for easy access, historical tracking, and collaborative reporting:

sheet\_write(OVR\_KPI\_DF, ss = ss, sheet = "Master")
bq\_table\_upload(x = mybq, values = OVR\_KPI\_DF)

#### 9. Price Comparison: Card Kingdom vs. TCGPlayer

Retrieves and analyzes two months of historical retail pricing data, pinpointing significant price movements and rankings:

CK\_Retail\_Comparison \<- CK\_Market\_\_Tracker - TCG\_Market\_Tracker

#### 10. Real-Time Inventory & Pricing API Integration

Integrates Card Kingdom's real-time inventory and buylist offers via their API, significantly enriching market analytics:

CK\_Inv \<- fromJSON("[https://api.cardkingdom.com/api/pricelist](https://api.cardkingdom.com/api/pricelist)") %>% as.data.frame()

#### 11. Detailed Market Reporting

Generates comprehensive reports combining market performance metrics with real-time inventory and buylist data, exported for immediate analysis and archiving:

sheet\_write(Market\_Comparison, ss = ss, sheet = "Market\_Comparisons")
bq\_table\_upload(x=mybq, values = Comparison\_Export)

***

### Summary of Practical Value and Technical Complexity

This script is an advanced analytical tool, automating the ingestion, transformation, and reporting of complex trading card market data. It significantly reduces manual analysis while enhancing precision and insight, offering an essential solution for market participants aiming for data-driven decision-making in trading card analytics.
