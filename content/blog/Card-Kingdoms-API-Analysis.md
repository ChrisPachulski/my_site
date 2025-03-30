---
title: Card Kingdoms API Analysis
date: 2025-03-29T04:00:00.000Z
featureImage: /card_kingdom_inc_logo_resized.png
---

# Automating Trading Card Analytics with R: A Deep Dive

Managing detailed trading card market analytics demands precision, speed, and efficient automation. In this blog post, I'll walk you through an advanced R script I've developed that accomplishes extensive data retrieval, complex transformations, sophisticated market analysis, and streamlined reporting specifically for the trading card industry.

## Overview: Purpose of the Script

This script primarily focuses on automating the retrieval, cleansing, analysis, and reporting of trading card market data, particularly focusing on price comparisons and inventory data from the well-known platform **Card Kingdom**.

***

## Step-by-Step Analysis

### 1. Initial Setup & Package Loading

First, the script efficiently loads all necessary libraries:

```r
require(pacman)
pacman::p_load(tidyverse, rvest, jsonlite, devtools, googlesheets4, googledrive, bigrquery, broom, anytime, httr, googleAuthR, skimr)
```

### 2. Custom Utility Functions

The script defines several custom helper functions to replicate Excel-like functionality in R:

* **Column Name Cleaning (`clean_names`)**:

Cleans and standardizes column names to ensure compatibility and ease of use.
(**When originally written - I had yet to discover the wonders of janitor**)

```r
clean_names <- function(.data, unique = FALSE) { ... }
```

* **Text Extraction Functions (`right`, `left`)**:

Recreates familiar Excel functions for easier text manipulation.

```r
right <- function(text, num_char) { substr(text, nchar(text) - (num_char-1), nchar(text)) }
left <- function(text, num_char) { substr(text, 1, num_char) }
```

* **Column Reordering (`moveme`)**:

Allows flexible rearrangement of dataframe columns, aiding readability and analysis.

```r
moveme <- function(invec, movecommand) { ... }
```

### 3. BigQuery Authentication & Data Retrieval

Establishes a secure connection with Google BigQuery:

```r
gaeas_cradle <- function() {
  service_account_file = '/path/to/credentials.json'
  gar_auth_service(service_account_file)
  bq_auth(path = service_account_file)
  con <- dbConnect(bigrquery::bigquery(), project = "gaeas-cradle", dataset = "premiums", billing = "gaeas-cradle")
  options(scipen = 20)
  con
}
```

Retrieves card data from BigQuery:

```r
statement <- "SELECT scryfall_id, tcg_id, card, set, rarity FROM `gaeas-cradle.roster.mtgjson`"
roster <- dbSendQuery(con, statement) %>% dbFetch(n = -1)
```

### 4. Data Integration from Google Sheets

Pulls supplementary set data and exclusion criteria directly from Google Sheets:

```r
ss <- drive_get("Sets")
editions <- read_sheet(ss, "Sets") %>% clean_names()
ck_conversion <- read_sheet(ss, "mtgjson_ck_sets") %>% clean_names()
```

### 5. API Integration & Buylist Data Processing

Fetches and processes real-time buylist data from Card Kingdom’s API:

```r
ck_buylist_raw <- fromJSON("https://api.cardkingdom.com/api/pricelist")
ck_buylist <- ck_buylist_raw$data %>% as_tibble() %>% clean_names()
```

The script thoroughly cleans and transforms buylist data, calculates differences between retail and buy prices, and identifies high-margin opportunities:

```r
slim_ck_buylist <- ck_buylist %>%
  mutate(qty_diff = round((qty_buying - qty_retail)/qty_buying, 3),
         price_diff = round(price_buy / price_retail, 3)) %>%
  filter(price_retail > .25, qty_retail > 0)
```

### 6. Advanced Web Scraping & Pricing Data Extraction

Scrapes detailed retail pricing information from Card Kingdom’s website:

```r
CK_Prices_df <- NULL
for(i in 1:Limit) { ... }
```

Processes scraped data for further analysis, including ranking adjustments based on price:

```r
cleansed_ck_sales_data <- CK_Prices_df %>%
  mutate(ck_adjusted_rank = round((prices/anchor_price)*ck_rank, 5))
```

**Special Note:** The `ck_adjusted_rank` is a crucial metric that adjusts the ranking of best-selling cards based on revenue by considering the relative volume sold. This effectively balances cards with high individual sale prices against those selling at high volumes but lower prices, providing a more comprehensive and actionable view of market performance.

*Most sites want to show off what generates them revenue - not what will drive inventory churn which is generally desired for smaller entities (like me)*\*

### 7. Comprehensive Market Analysis & Reporting

Combines various data sources into a unified analytical dataset:

```r
public_output <- dollar_slim_ck_buylist %>%
  left_join(cleansed_ck_sales_data, by="semi_key") %>%
  mutate(velocity = round(exp((log(price_tiles) + log(qty_tiles) + log(sell_rank))/3), 3))
```

Identifies targeted investment opportunities based on detailed filters:

```r
high_margin_fast_sellers <- public_output %>%
  filter(price_diff > .5, price_buy >= 3, margin_perc >= .70, sell_rank <= 1000)
```

### 8. Automated Output & Reporting Integration

Final processed datasets are automatically exported to Google Sheets and BigQuery for efficient access and historical tracking:

```r
sheet_write(high_margin_fast_sellers, ss = drive_get("ck_margin_winners"), sheet = "margin_winners")
bq_table_upload(x=mybq, values = bq_table_data, source_format = "CSV", write_disposition = "WRITE_TRUNCATE")
```

***

## Conclusion: Practical Impact

This script significantly accelerates the process of trading card market analytics, providing robust, automated data retrieval, complex transformations, precise analyses, and streamlined reporting. Such detailed automation is invaluable, reducing hours of manual work into minutes of automated precision.

And it makes me look really cool in 5 minutes in a chat room when I can glean market insights so quickly and with little to no preparations.
