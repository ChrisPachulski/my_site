---
title: 'MTGBAN - Newspaper Updater: R, Google Cloud Platform, BigQuery'
date: 2022-10-09T04:00:00.000Z
featureImage: /images/hero/newspaper.png
---

# Integrating R with Google Cloud Platform and BigQuery for Advanced Data Automation

The power of automation in data analytics is magnified when combining the flexibility of R, the robustness of Google Cloud Platform (GCP), and the scalability of BigQuery. This article explores a real-world scenario through the detailed implementation of two scripts: `newspaper_updater.R` and `newspaper_updater_functions.R`, emphasizing the required technical knowledge and integrations.

## Overview of the Workflow

The primary goal of these scripts is to automate data extraction, transformation, and loading (ETL) processes, ensuring timely, accurate, and automated reporting.

## Technical Knowledge Required

### 1. R Programming

* **Libraries:** tidyverse, janitor, jsonlite, RMySQL, gmailr, bigrquery, googlesheets4, googledrive.
* **Error Handling:** Comprehensive use of `tryCatch()` to ensure robust execution.
* **Functional Programming:** Modular design using functions to ensure reusability and maintainability.

### 2. Google Cloud Platform (GCP)

* **Authentication:** Understanding OAuth and credential management via JSON keys.
* **Service Integration:** Interaction with Google Sheets, Google Drive, and Gmail APIs for seamless data management and reporting.

### 3. BigQuery SQL

* **Dataset Management:** Dynamic querying of INFORMATION\_SCHEMA to automate table updates.
* **Advanced SQL:** Leveraging regular expressions (`regexp_extract`, `regexp_replace`) and aggregation functions for robust and dynamic data handling.

### 4. Business Intelligence & Data Engineering

* **Automated Reporting:** Scheduled script execution to maintain data accuracy and consistency.
* **Data Warehousing:** Use of BigQuery as a data warehouse to consolidate various data sources efficiently.

## Detailed Script Breakdown

### `newspaper_updater.R`

* **Authentication Setup:** Manages authentication across various Google services to ensure uninterrupted script execution.
* **Dataset Extraction and Replacement:** Automates querying and updates datasets (`premiums`, `ck_funny_money`, `buylist_growth`, `demand_growth`, `vendor_growth`, `kpi`, `ck_velocity`, and `ensemble_forecast_results`).
* **Data Upload:** Pushes processed data into structured MySQL databases for further business analysis and reporting.
* **Failsafe Logic:** Implements advanced error handling mechanisms with automatic email notifications for success or failure.

### `newspaper_updater_functions.R`

* **Database Connections:** Establishes reliable and secure connections to MySQL and BigQuery databases.
* **Google Sheets Integration:** Automates retrieval and transformation of auxiliary data from Google Sheets for further processing.
* **Dynamic Data Handling:** Uses conditional logic and error handling to manage dataset integrity, ensuring reliable historical data availability.

## Real-world Applications

* Automated business reporting and KPI management.
* Proactive error detection and reporting via automated email alerts.
* Seamless integration with business intelligence tools to empower data-driven decisions.

## Conclusion

The combination of R, GCP, and BigQuery facilitates a powerful, scalable, and highly maintainable approach to data analytics and automation. These scripts exemplify robust technical integration, error management, and functional programming principles necessary for efficient and reliable analytics workflows.
