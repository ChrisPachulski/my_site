---
title: >-
  Buying Support for Journey's End Game Store Through R, SQL, and Effective
  Communication
date: 2023-05-14T04:00:00.000Z
featureImage: /801b7b74-image-removebg-preview-28_resized.png
---

As a consultant working with [Journey's End Game Store](https://journeysendgames.com), the project required leveraging analytical insights to enhance inventory management and sales strategies. By employing R for data analysis, SQL for efficient data retrieval, and emphasizing clear, actionable spreadsheet outputs, we significantly optimized operational decisions. This blog post highlights the importance of clear communication, powerful data handling through SQL and R, and practical reporting via spreadsheets specifically tailored to the needs of Journey's End.

### The Importance of Communication

Clear and regular communication with Journey's End stakeholders was essential for ensuring alignment between analytical outputs and business goals. Initial discussions identified critical business needs, such as:

* Inventory optimization based on sales trends
* Real-time pricing strategies
* Identifying best-selling products

Continuous feedback loops and straightforward spreadsheet presentations were crucial for maintaining transparency and usability of analytical outcomes.

### Data Retrieval Using SQL

Efficient data retrieval from extensive databases was foundational for our analysis. We utilized Google's BigQuery through R, effectively extracting relevant data:

* **Sales Data**: Using structured SQL queries to fetch detailed transactional data.
* **Market Pricing**: Real-time pricing data was gathered to adjust inventory pricing competitively.
* **Card Popularity**: Extracting data to identify best-sellers and track trends over time.

SQL enabled rapid, accurate, and scalable data collection, forming a solid foundation for subsequent analytical processes.

### Data Processing and Analysis in R

R provided a flexible environment to transform and analyze extensive datasets. Libraries such as `tidyverse`, `janitor`, `data.table`, and `jsonlite` streamlined data preparation, analysis, and cleaning.

Key R functionalities implemented:

* **Data Cleaning and Transformation**:

```r
final_data <- raw_data %>%
    rename_all(~str_to_title(gsub('_', ' ', .x))) %>%
    filter(!grepl('(Plains|Mountain|Island|Swamp|Forest|Wastes)', card_name)) %>%
    mutate(rank = seq(nrow(.)))
```

* **Efficient Joins and Merges**:

```r
combined_data <- primary_data %>%
    left_join(secondary_data, by = c("card", "set", "rarity"))
```

* **Calculation of Market Metrics**:

R scripts computed key performance indicators (KPIs) like market support ratios, pricing evaluations, and sales ranks.

### Real-time Pricing and Best-Selling Cards Identification

Utilizing R functions, we regularly updated best-seller lists and real-time pricing data:

```r
best_sellers <- real_tcgplayer_best_sellers()
pricing_data <- real_pricing()
```

These functions called APIs and executed SQL queries to ensure Journey's End consistently accessed timely, accurate market intelligence, essential for competitive pricing and inventory strategies.

### Practical Spreadsheet Outputs

The importance of user-friendly spreadsheet outputs cannot be overstated, as they facilitate easy interpretation and immediate action by stakeholders at Journey's End. Using R’s integration with Google Sheets, we provided clear and structured reports:

```r
drive_auth(email = "example@gmail.com", use_oob = TRUE)
gs4_auth(email = "example@gmail.com", use_oob = TRUE)

sheet <- drive_get("Journey's End Analytics Report")
sheet_write(ss = sheet, sheet = "Inventory Recommendations", data = final_data)
```

This enabled stakeholders to seamlessly interact with data insights without requiring advanced analytical skills, enhancing operational efficiency.

### Challenges and Solutions

A critical part of this consulting engagement was navigating the complexities of large datasets and ensuring reliable data integration for Journey's End:

* **Large Data Handling**: Implementing robust data handling techniques in R, such as garbage collection (`gc()`) and data.table optimization.
* **Error Handling and Automation**: Scripts were equipped with try-catch blocks for error management and automatic retries for API calls.
* **Regular Updates**: Automated scheduling via cron jobs ensured data was always current and accessible.

### Outcomes and Business Impact

The combination of SQL’s powerful querying capabilities and R’s analytical strength provided actionable insights, empowering Journey's End Game Store to:

* Optimize inventory based on robust sales analytics
* Implement dynamic pricing strategies quickly
* Focus purchasing strategies on proven best-sellers

Regular communication and accessible spreadsheet reports ensured Journey's End could swiftly act upon these insights, enhancing profitability and customer satisfaction.

### Conclusion

By combining robust SQL data extraction, sophisticated analytical capabilities in R, and clear, actionable spreadsheet reports, we effectively streamlined inventory management and pricing strategies at Journey's End Game Store. The success of this project underscored the value of clear communication, efficient data handling, and practical reporting, essential elements in achieving tangible business improvements.
