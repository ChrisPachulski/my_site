---
title: Advanced Traffic Flow Analysis and Data Management with Python and SQL
date: 2022-12-11T05:00:00.000Z
featureImage: /Python.svg_resized.png
---

In today's data-driven advertising landscape, the ability to accurately track, manage, and optimize traffic data is paramount. This post explores two sophisticated Python scripts designed to handle complex traffic flow analysis, combining powerful SQL queries executed via Python for efficient data management and optimization.

### Script Overview

In two Python scripts I have recently written (`traffic_flow_backfill.py` and `traffic_flow_load.py`), they are designed to perform extensive analysis and maintain the integrity of advertising traffic data. These scripts handle critical operations such as data retrieval, conditional logic for filtering and classifying data, robust error handling, and integration with ClickHouse databases for efficient storage and querying.

### Python Environment Setup

Both scripts utilize several important Python libraries to facilitate seamless data handling:

```python
import pandas as pd
import numpy as np
from clickhouse_driver import Client
import addotnet_functions as anf
```

These libraries streamline the tasks of data manipulation (`pandas`, `numpy`), database interactions (`clickhouse_driver`), and custom utility functions (`addotnet_functions`) **custom package I have written for internal BI team**.

### Complex SQL Queries

At the heart of both scripts lies an intricate SQL query crafted to extract detailed traffic data, perform transformations, and apply conditional logic for categorization:

```sql
SELECT 
  sq.dt, sq.event_date, sq.search_date, sq.search_hour, sq.click_date, sq.click_hour,
  sq.affiliate_account_name, sq.sid, sq.traffic_source_name, sq.said,
  sq.next_hop_url, sq.mark_url, sq.country_name, sq.state_name, sq.dma_name,
  sq.search_user_agent, sq.user_agent, sq.search_ip, sq.client_ip,
  sq.is_mobile, sq.search_keyword, sq.integration_type, sq.adgroup_name,
  sq.campaign_name, sq.advertiser_name, sq.served_requests,
  sq.reason_for_not_served, sq.truly_filtered,
  -- Conditional logic example
  CASE 
    WHEN (sq.cappedBlackListFilterName = sq.filteredAdvertiserName) AND 
         (sq.reason_for_filtered_1 LIKE 'QualityBucketAndWhiteListFilter') THEN 'TrafficProviderBlackListFilter'
    ELSE sq.reason_for_filtered_1 
  END AS reason_for_filtered,
  -- Additional complex conditional cases
  SUM(CASE
    WHEN (...) THEN sq.r
    WHEN (...) THEN sq.rc
    ELSE 0
  END) AS uuid_count,
  SUM(sq.r) AS r, SUM(sq.a) AS a, SUM(sq.rc) AS rc, SUM(sq.pc) AS pc
FROM (
  -- Subquery for detailed event analysis
  SELECT today() AS dt, e.event_date,
  toDate(e.search_timestamp) AS search_date,
  toHour(e.search_timestamp) AS search_hour,
  -- More detailed column definitions and joins
FROM {table name} e
LEFT JOIN (...)
WHERE e.event_date = toDate('2023-10-03')
GROUP BY dt, e.event_date, search_date, search_hour, ...
HAVING r > 0
) sq
GROUP BY sq.dt, sq.event_date, sq.search_date, sq.search_hour, ...;
```

This SQL statement intricately captures multiple dimensions of traffic data, applying sophisticated filters to handle special cases and categorize traffic effectively.

### Data Handling and Error Management

Both scripts employ robust Python logic to handle large datasets efficiently. Notably, they include structured exception handling to manage common issues such as memory constraints:

```python
for publisher in publishers_df['affiliate_account_name']:
    try:
        traffic_flow_query_logic(desired_date=date, desired_pub=publisher,
                                 db_client=Client('database_host'),
                                 start_hour='', end_hour='')
        print(f'Daily data inserted for Publisher: {publisher} on {date}.')
    except ServerException:
        print(f'Memory limit exceeded for Publisher: {publisher} on {date}. Breaking into hourly segments.')
        for hour_range in [(0, 4), (5, 9), (10, 14), (15, 19), (20, 24)]:
            traffic_flow_query_logic(desired_date=date, desired_pub=publisher,
                                     db_client=Client('database_host'),
                                     start_hour=hour_range[0], end_hour=hour_range[1])
            print(f'Hourly data inserted for Publisher: {publisher}, Date: {date}, Hours: {hour_range[0]}-{hour_range[1]}.')
```

This strategic handling ensures consistent data availability even in resource-constrained scenarios.

### Dynamic Data Insertion

Data retrieved from ClickHouse is efficiently inserted back into the database using custom functions:

```python
anf.insert_data_into_ch(
  data=singleresult_df,
  data_base='addotnet',
  table_name='traffic_flow',
  new_table=False
)
```

This automated insertion process maintains data integrity and ensures that analytics teams always work with up-to-date, accurate datasets.

### Automation and Flexibility

The scripts are designed for automation, leveraging environment variables for flexible date management and execution:

```python
airflow_date = pd.to_datetime(os.environ["PROCESS_DATE"]).strftime('%Y-%m-%d')
```

This design choice significantly enhances the script's adaptability for continuous integration and deployment in dynamic environments.

### Practical Applications

These scripts provide significant value through:

* **Granular Traffic Analysis:** Deep insights into traffic sources, user behavior, and conversion events.
* **Robust Error Handling:** Ensures continuous data flow, minimizing downtime.
* **Efficient Database Management:** Reduces resource consumption through precise query execution and segmented data handling.

### Conclusion

Utilizing Python's versatility combined with sophisticated SQL querying allows businesses to perform in-depth analysis and management of advertising traffic data. The highlighted scripts showcase powerful data engineering techniques essential for driving strategic business decisions, optimizing ad spend, and ensuring data accuracy and availability.
