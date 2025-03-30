---
title: In-Depth Product-Level Analysis Using R for Advanced Market Insights
date: 2023-09-09T04:00:00.000Z
---

Performing a detailed product-level analysis requires careful data manipulation, precise categorization, and insightful text analytics. In this blog post, we'll explore a structured, privacy-aware approach to analyzing product advertising data using R and essential packages such as `tidyverse`, `lubridate`, and `tidytext`.

### Preparing the Analysis Environment

We start by loading the necessary libraries to ensure an efficient and powerful data analysis environment:

```r
pacman::p_load(tidyverse, janitor, lubridate, anytime, RClickhouse, DBI, RMySQL, tidytext)
```

These packages collectively offer extensive capabilities for data import, manipulation, cleaning, text analytics, and database connectivity.

### Data Retrieval from Databases

Our analysis involves fetching specific product-related data using targeted SQL queries directly from databases, such as ClickHouse:

```r
wayfair_pla <- DBI::dbGetQuery(conn,"
  SELECT dt, id, title, brand, sale_price, product_category
  FROM feed_pla_master
  WHERE lower(advertiser_name) LIKE 'wayfair%'
    AND dt BETWEEN toDate('2022-01-01') AND toDate('2023-08-29')
    AND lower(product_category) LIKE '%furniture > chair%'
    AND availability NOT LIKE 'out of stock'
    AND title LIKE '%Wingback Chair - Winston Porter Abem 23.03%'
") %>% as_tibble() %>% mutate_if(bit64::is.integer64, as.numeric)
```

This ensures precise data retrieval, specifically targeting relevant products and timeframes.

### Comprehensive Data Cleaning

Subsequent steps involve thorough cleaning, including normalizing product identifiers and categories:

```r
ch_wayfair_cleansed <- ch_wayfair %>% mutate(id = gsub('^0+{3}', '', id))
```

Normalization facilitates effective joins and comparisons between datasets from different sources.

### Advanced Data Integration

We integrate external advertising performance data by performing detailed join operations:

```r
joined_macys_bing_data <- bing_macys_data %>%
  left_join(ch_macy_cleansed, by = c('merchant_product_id' = 'id', 'title' = 'title')) %>%
  distinct()
```

This approach helps in evaluating product visibility and advertising performance comprehensively.

### Product Category Analysis

We perform granular category analyses to identify characteristics of descriptive product titles across main, middle, and lower categories:

```r
main_category_descriptive_titles <- joined_macys_bing_data %>%
  separate(product_category, into = c('main_category', 'middle_category', 'lower_category'), sep = ' > ') %>%
  drop_na() %>%
  group_by(main_category) %>%
  summarise(
    count = n(),
    avg_title_length = mean(nchar(title)),
    avg_word_count = mean(str_count(title, "\\S+"))
  ) %>%
  arrange(desc(avg_title_length))
```

Such detailed analyses provide actionable insights into product marketing and content strategy.

### Identifying Gaps in Advertising

To reveal potential gaps in advertising coverage, we systematically analyze products without recorded advertising impressions:

```r
missing_macys_bing_data <- ch_macy_cleansed %>%
  left_join(bing_macys_data, by = c('id' = 'merchant_product_id', 'title' = 'title')) %>%
  distinct() %>%
  filter(is.na(account_name))
```

This highlights products that might need enhanced advertising attention.

### Text Analytics for Keyword Optimization

Utilizing the power of `tidytext`, we conduct n-gram analyses to identify the most impactful keywords in product titles:

```r
ngram_titles <- unique_titles %>%
  unnest_ngrams(ngram, title, n = 2)

top_ngrams <- ngram_titles %>%
  count(main_category, ngram, sort = TRUE) %>%
  group_by(main_category) %>%
  slice_max(n, n = 25)
```

Such keyword analyses inform strategic decisions about product naming and marketing language.

### Analyzing Cost-Per-Click (CPC)

A comprehensive CPC analysis segmented by product pricing provides crucial insights into advertising efficiency:

```r
summary_df <- joined_macys_bing_data %>%
  mutate(Price_Bucket = case_when(
    sale_price < 25 ~ "Under $25",
    sale_price >= 25 & sale_price < 50 ~ "$25 - $50",
    sale_price >= 50 & sale_price < 100 ~ "$50 - $100",
    sale_price >= 100 & sale_price < 250 ~ "$100 - $250",
    sale_price >= 250 ~ "Above $250"
  )) %>%
  group_by(Price_Bucket) %>%
  summarise(Avg_CPC = mean(avg_cpc, na.rm = TRUE), Count = n()) %>%
  drop_na()
```

Understanding CPC trends across price buckets allows strategic allocation of advertising budgets.

### Visualization for Enhanced Insights

We leverage powerful visualizations, such as bar plots, to clearly communicate insights and facilitate decision-making:

```r
ggplot(summary_df, aes(x = Price_Bucket, y = Avg_CPC)) +
  geom_bar(stat = "identity", aes(fill = Price_Bucket)) +
  geom_text(aes(label = paste("Count: ", Count)), vjust = -0.5) +
  ggtitle("Average CPC by Product Price Bucket") +
  xlab("Product Price Bucket") +
  ylab("Average CPC")
```

### Final Thoughts

This detailed, privacy-conscious workflow demonstrates the powerful capabilities of R for conducting sophisticated market analyses. Leveraging robust text analytics, precise database querying, and insightful visualization, we provide clear, actionable insights essential for strategic business decisions.
