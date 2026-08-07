---
title: 'Inventory Acquisition with Google Sheets, Apps Script, SQL, and R'
date: 2023-10-15T04:00:00.000Z
featureImage: /images_resized.png
---

## Streamlining Game Store Inventory Management with Google Sheets, Apps Script, SQL, and R

Efficient inventory management and purchasing decisions are vital for the success of any retail business, especially niche markets like local game stores. In this project, I developed an integrated solution using Google Sheets, Apps Script, SQL, and R to help streamline purchasing, automate catalog updates, and provide a visually intuitive buying process. Here’s a detailed look at the approach and tools used, illustrated by a practical [example Google Sheet](https://docs.google.com/spreadsheets/d/1d1svZvpqLDMbUvwN5X0jaU2Se_jq2ca_ouuaXgO85_U/edit?usp=sharing).

### Objective

The main goal was to simplify and automate the buying process for a local game booth (Specifically - Tarkan) at an conn event, ensuring that inventory levels, pricing data, and purchasing history were accurate, accessible, and easy to manage.

### Setting Up the Google Sheet

The Google Sheet serves as the central hub for managing orders and inventory. It contains several critical tabs:

* **Orders Tab:** For viewing available products, setting purchase conditions, and adding items to the cart.
* **Cart Tab:** Compiles selected items, allowing staff to review and finalize their orders.
* **All Purchases Tab:** Logs completed transactions with timestamps, serving as a historical reference for sales analytics and inventory control.
* **Catalog Tab:** Automatically updated using SQL and R scripts, providing current inventory details and pricing.

### Automating Data Refreshes with SQL and R

To keep the Catalog tab accurate and updated in real-time, I employed SQL queries executed via R scripts. These scripts retrieve and clean data from databases, ensuring the Google Sheet reflects real-time inventory and pricing information.

A simplified overview of the SQL and R integration:

* **SQL Queries:** Extract up-to-date inventory, pricing, and product information from store databases.
* **R Data Processing:** The retrieved data is then cleaned, structured, and formatted using the powerful R libraries such as `tidyverse` and `data.table`, ready for integration into the Google Sheet.
* **Google Sheets Integration:** R scripts utilize the `googlesheets4` package to automatically populate and refresh the Catalog tab.

This automation ensures data accuracy, saves significant manual entry time, and provides reliable, real-time insights for purchasing decisions.

### Enhancing User Experience with Apps Script

The Google Apps Script significantly enhances usability and interaction within the spreadsheet. Here's what happens behind the scenes:

* **Automatic Cart Management:** When staff select items to purchase via checkboxes in the Orders tab, Apps Script automatically transfers the selections to the Cart tab, including condition and pricing details.
* **Purchase Logging:** Upon finalizing the order, selecting the reset checkbox in the Cart tab triggers the Apps Script to log purchases into the All Purchases tab with timestamps, facilitating easy historical tracking.
* **Dynamic Condition and Pricing Selection:** If no specific condition is chosen, the system defaults to standard conditions automatically, streamlining the purchasing flow.

### Visual Icons for Intuitive Navigation

Recognizing the need for clear visual guidance, icons were strategically included in the Google Sheet:

* **Checkboxes and Icons:** These visually indicate product conditions and selection status, simplifying quick identification and minimizing purchasing errors.
* **Condition Icons:** Clearly indicate different product conditions (e.g., new, lightly played, moderately played), ensuring purchasers have all the essential information readily available without cluttering the sheet with excessive text.

These visual enhancements reduce cognitive load and allow faster, more accurate purchasing decisions.

### Practical Workflow Illustrated by the Example Sheet

Using the [example Google Sheet provided](https://docs.google.com/spreadsheets/d/1d1svZvpqLDMbUvwN5X0jaU2Se_jq2ca_ouuaXgO85_U/edit?usp=sharing), here’s how a typical workflow would occur:

1. **Catalog Update:** Automatically refreshed daily via SQL/R scripts.
2. **Item Selection:** Store staff selects items via checkboxes in the Orders tab.
3. **Cart Review:** Selected items automatically populate the Cart tab, displaying details and totals.
4. **Finalize Purchases:** The reset checkbox triggers the logging of purchases into the All Purchases tab with timestamps, clearing the Cart tab for new selections.

### Benefits Realized

Implementing this integrated solution provided substantial operational improvements:

* **Efficiency:** Dramatically reduced time spent on manual inventory updates and purchasing.
* **Accuracy:** Real-time inventory and pricing data minimized purchasing errors and inventory discrepancies.
* **Enhanced Decision-Making:** Historical purchase logging improved inventory forecasting and restocking decisions.
* **User-Friendly Interface:** Clear visual guidance and intuitive interface boosted staff adoption and productivity.

### Conclusion

Through careful integration of Google Sheets, Apps Script, SQL, and R, this tailored solution significantly enhanced the purchasing and inventory management capabilities of the local game store. This project highlights the importance of clear communication, automated workflows, and intuitive visual interfaces in supporting and optimizing retail operations. Explore the provided example Google Sheet to see these practical strategies in action.
