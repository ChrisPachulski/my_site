---
title: 'Advanced Advertising Analytics with R: Unlocking Data-Driven Insights'
date: 2023-05-28T04:00:00.000Z
featureImage: /static/R_logo_resized.png
---

Leveraging R and robust database integrations, businesses can gain deep analytical insights into advertising performance. In this blog post, we explore sophisticated R scripts designed specifically to analyze advertising data, competitor presence, and market behavior through comprehensive queries and transformations, all crafted with privacy and confidentiality in mind.

### Preparing the Analytical Environment

Our analytical workflow starts by setting up an efficient R environment using essential libraries:

```r
pacman::p_load(tidyverse, janitor, lubridate, anytime, RClickhouse, DBI, skimr, readxl, googlesheets4, googledrive)
```

This toolkit provides powerful functionality for data management, manipulation, and visualization, integral for advanced analytics.

### Database Connectivity

To extract actionable data, we establish seamless connections with ClickHouse databases:

```r
conn = ch4_connect()
```

This connection allows precise, high-performance data retrieval, essential for handling large-scale advertising datasets.

### Detailed Competitor Analysis

One core analytical operation involves competitor identification and performance tracking. Queries are crafted to extract competitor-related data from advertising events, enabling precise market positioning insights:

```sql
data = DBI::dbGetQuery(conn, "
  SELECT DISTINCT affiliate_account_name, mark_url, said, search_keyword,
    CASE WHEN event_date BETWEEN '2022-04-01' AND '2023-03-31' THEN period_definition END as period,
    CASE WHEN (LOWER(mark_url) LIKE '%unicef%' OR LOWER(said) LIKE '%unicef%' OR LOWER(search_keyword) LIKE 'unicef') THEN 'unicef' END as competitor,
    SUM(requests) AS requests,
    SUM(paid_clicks) AS clicks,
    SUM(revenue) AS revenue
  FROM ad_event_view
  WHERE event_date BETWEEN '2022-04-01' AND '2023-03-31'
    AND (integration_type LIKE 'RTB' OR integration_type LIKE 'XML')
    AND (LOWER(mark_url) LIKE '%unicef%' OR LOWER(said) LIKE '%unicef%' OR LOWER(search_keyword) LIKE 'unicef')
  GROUP BY affiliate_account_name, search_keyword, mark_url, said, period, competitor
  ORDER BY requests DESC;
") %>% as_tibble() %>% mutate_if(bit64::is.integer64, as.numeric)
```

This targeted extraction highlights competitor market activities, providing detailed performance metrics like requests, clicks, and revenue.

### Non-Brand Advertising Analysis

Equally important is analyzing non-brand keyword performance, crucial for understanding market opportunities and consumer interests:

```sql
nonbrand_data = DBI::dbGetQuery(conn, "
  SELECT DISTINCT affiliate_account_name, mark_url, said, search_keyword,
    CASE WHEN event_date BETWEEN '2022-04-01' AND '2023-03-31' THEN period_definition END as period,
    SUM(requests) AS requests,
    SUM(paid_clicks) AS clicks,
    SUM(revenue) AS revenue
  FROM ad_event_view
  WHERE event_date BETWEEN '2022-04-01' AND '2023-03-31'
    AND (integration_type LIKE 'RTB' OR integration_type LIKE 'XML')
    AND (
      LOWER(mark_url) LIKE '%tech%install%' OR
      LOWER(mark_url) LIKE '%comp%repair%' OR
      LOWER(mark_url) LIKE '%smart%home%install%' OR
      LOWER(mark_url) LIKE '%virus%removal%' OR
      LOWER(mark_url) LIKE '%cloud%servic%'
      -- Additional targeted keywords...
    )
  GROUP BY affiliate_account_name, search_keyword, mark_url, said, period
  ORDER BY requests DESC;
") %>% as_tibble() %>% mutate_if(bit64::is.integer64, as.numeric)
```

This analysis provides strategic visibility into consumer behavior, advertising efficiency, and potential expansion areas within targeted service sectors.

### Granular Competitor Keyword Insights

Further granularity is achieved through keyword-specific queries, particularly valuable for brands such as Azure and competitors in cloud computing:

```sql
competitor_data = DBI::dbGetQuery(conn, "
  SELECT DISTINCT affiliate_account_name, mark_url, said, search_keyword,
    CASE WHEN event_date BETWEEN '2022-04-01' AND '2023-03-31' THEN period_definition END as period,
    SUM(requests) AS requests,
    SUM(paid_clicks) AS clicks,
    SUM(revenue) AS revenue
  FROM ad_event_view
  WHERE event_date BETWEEN '2022-04-01' AND '2023-03-31'
    AND (integration_type LIKE 'RTB' OR integration_type LIKE 'XML')
    AND (
      LOWER(mark_url) LIKE '%aws%' OR
      LOWER(mark_url) LIKE '%google%cloud%' OR
      LOWER(mark_url) LIKE '%ibm%cloud%' OR
      LOWER(mark_url) LIKE '%oracle%cloud%'
      -- Additional competitor identifiers...
    )
  GROUP BY affiliate_account_name, search_keyword, mark_url, said, period
  ORDER BY requests DESC;
") %>% as_tibble() %>% mutate_if(bit64::is.integer64, as.numeric)
```

This precise competitor benchmarking facilitates strategic positioning and targeted advertising investments.

### IP-Level Advertising Investigation

Detailed investigative analytics at the IP level further enhances advertising accuracy and fraud detection capabilities:

```sql
ip_data = DBI::dbGetQuery(conn, "
  SELECT DISTINCT uuid, publisher_referrer_domain, event_timestamp, dma_name, search_ip, publisher_referrer, mark_url,
    SUM(requests) AS requests,
    SUM(raw_clicks) AS raw_clicks,
    SUM(paid_clicks) AS clicks
  FROM addotnet.ad_event_view
  WHERE event_date >= '2023-03-16'
    AND search_ip IN ('185.187.168.189', '194.195.93.36', '185.169.0.83' -- additional IP addresses...)
  GROUP BY uuid, publisher_referrer_domain, event_timestamp, dma_name, search_ip, publisher_referrer, mark_url
  HAVING requests > 0
  ORDER BY uuid, clicks DESC;
")
```

This investigation identifies potentially anomalous traffic patterns, improving advertising spend efficiency and fraud mitigation.

### Data Exportation and Actionable Insights

Results from these detailed analyses are meticulously summarized, then exported for easy integration into strategic decision-making processes:

```r
summarized_data %>%
  group_by(period) %>%
  summarize(requests = scales::comma(sum(requests)), clicks = sum(clicks), revenue = sum(revenue)) %>%
  write_csv('output_file.csv')
```

Efficient data exportation allows stakeholders to quickly leverage insights in operational and strategic contexts.

### Conclusion

Employing advanced R analytics with detailed, targeted data queries and transformations allows organizations to derive critical insights into advertising performance, competitor behavior, and market opportunities. This approach provides a comprehensive, data-driven foundation for strategic business decisions, optimizing advertising efficacy and market competitiveness, all while maintaining stringent data privacy.
