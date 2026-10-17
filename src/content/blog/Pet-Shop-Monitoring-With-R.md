---
title: 'Pet Shop Monitoring with R'
date: 2025-04-27T04:00:00.000Z
---

As a proud owner of three wonderful dachshunds (Ruby, Moose, & Poppy) and a data guy by profession, I find myself in a familiar predicament: I want to add a fourth furry friend to our family, specifically a dachshund or basset hound. My wife, however, needs some convincing. So, I decide to combine my love for pets with my technical skills to create a sophisticated R-based automation system that helps me track available puppies at The Pet Shop Easton. In this blog post, I'll share how I build a comprehensive monitoring solution that not only satisfies my data analysis curiosity but also serves as my not so secret strategy in the ongoing "fourth dog" negotiations with my wife.

In my never ending endeavor to annoy and inspire eye rolls - I also realized I will be able to track overall adoptions, breed preferences, breeder frequency, and overall volume at this location. Apparently - creating this makes me "extra" - but I've decided to take that as a compliment.

You can find the complete source code and documentation for this project on [GitHub](https://github.com/ChrisPachulski/the-pet-shop-easton).

## Setting Up the Analytical Environment

My automation workflow begins with a carefully curated set of R packages that provide all the necessary functionality. The complete package list can be found in the [main.R](https://github.com/ChrisPachulski/the-pet-shop-easton/blob/main/main.R) file:

```r
pacman::p_load(tidyverse, rvest, janitor, httr, readxl, bigrquery, googleAuthR, lubridate, cronR, shinyFiles, gmailr)
```

This toolkit enables everything from web scraping to cloud database integration, email notifications, and AI-written puppy bios, forming the backbone of my automation system.

## Database Integration

To maintain a historical record of puppy availability (and build my case for that perfect fourth dog), I implement Google BigQuery integration. The authentication process is handled in the [authenticate.R](https://github.com/ChrisPachulski/the-pet-shop-easton/blob/main/R/authenticate.R) script:

```r
con = authenticate_bq_and_google()
```

This connection allows me to store and analyze data across multiple datasets, tracking available puppies, those of interest, and adoption patterns over time.

## Web Scraping Implementation

The core of my system involves automated data collection from The Pet Shop Easton's website, specifically looking for those adorable dachshunds and basset hounds. The scraping logic is implemented in [scraping.R](https://github.com/ChrisPachulski/the-pet-shop-easton/blob/main/R/scraping.R):

```r
url = "https://thepetshopinc.com/available-puppies"
raw_puppy_data = fetch_all_puppy_details(url)
parsed_puppy_data = parse_puppy_details(raw_puppy_data)
```

This automated scraping process captures detailed information about each available puppy, including breed, age, images, and crucially, breeder IDs - perfect for those "look how cute!" moments with my wife, but also essential for responsible pet adoption.

## Breeder Classification and GPT Integration

I've discovered that not all breeders are created equal, and it's crucial to investigate their backgrounds. The first pass happens in `parse_puppy_details` in [cleaning.R](https://github.com/ChrisPachulski/the-pet-shop-easton/blob/main/R/cleaning.R), which sorts each listing's Dam USDA field into a breeder type:

```r
breeder_type = case_when(
  str_detect(dam_usda, "^\\d{2}-[A-Z]-\\d{4,}$") ~ "USDA Formatted (Unverified)",
  str_to_upper(dam_usda) %in% c("N/A", "NA", "") ~ "NA",
  str_detect(dam_usda, "^(TPX|TS|WS|NP|DN|E|F|C|MOABA|ILABA|OKABA|MNABA|OHICA|INABA)[_A-Z0-9]+") ~ "Internal Breeder ID",
  str_detect(str_to_lower(dam_usda), "hobby") ~ "Hobby",
  TRUE ~ "Uncategorized"
)
```

That's a format check, not a background check - a USDA-shaped number is just a USDA-shaped number until someone actually looks it up, hence the "(Unverified)". The looking up is still on me.

GPT gets the more fun job, in [email_content.R](https://github.com/ChrisPachulski/the-pet-shop-easton/blob/main/R/email_content.R): it looks at each puppy's photo and writes a short, overtly whimsical back story for the alert email, keeping the breed, gender, and name straight along the way.

## Data Processing and Analysis

I implement sophisticated data cleaning and analysis pipelines, with a special focus on our breeds of interest. The data processing logic can be found in [cleaning.R](https://github.com/ChrisPachulski/the-pet-shop-easton/blob/main/R/cleaning.R):

```r
breed_regex = "(dachs|basset)"
pups_of_interest = filter_puppies_by_breed(parsed_puppy_data, breed_regex)
```

This filtering system helps me stay focused on the breeds that would make the perfect addition to our family, while maintaining comprehensive data on all available puppies.

## Adoption Detection

One of the most valuable features I implement is automated adoption detection. The adoption detection logic is implemented in [detect_adoptions.R](https://github.com/ChrisPachulski/the-pet-shop-easton/blob/main/R/detect_adoptions.R):

```r
detect_adoptions(con, table_header = "puppies")
```

This system compares consecutive days' data to identify which puppies have been adopted, helping me understand how quickly these adorable pups find their forever homes - and ensuring I don't miss any opportunities to show my wife that perfect puppy from a responsible breeder.

## Interest Tracking System

I develop a sophisticated tracking system for puppies of interest. The tracking logic is implemented in [pups_of_interest_tracker.R](https://github.com/ChrisPachulski/the-pet-shop-easton/blob/main/R/pups_of_interest_tracker.R):

```r
alert_me_pups = track_and_upload_pups_of_interest(pups_of_interest, con)
```

This system maintains a running count of how many consecutive days each puppy has been available, helping me identify new arrivals and long-term residents - perfect for those "they've been waiting for a home" conversations.

## Automated Notifications

To ensure I never miss a new puppy of interest (and can promptly show my wife), I implement an email notification system. The email functionality is implemented in [send_email.R](https://github.com/ChrisPachulski/the-pet-shop-easton/blob/main/R/send_email.R) and [email_content.R](https://github.com/ChrisPachulski/the-pet-shop-easton/blob/main/R/email_content.R):

```r
if (nrow(alert_me_pups) > 0) {
  email_body = create_email_content(alert_me_pups, breed_regex)
  send_email_alert(
    subject = paste0(Sys.Date(), " Puppy Breed Alert"),
    email_content = email_body
  )
}
```

This system automatically sends detailed alerts when new puppies matching our criteria become available, giving me the perfect opportunity to casually mention, "Oh, look what just became available..." along with a GPT-written back story to seal the deal.

## Data Storage and Organization

My system maintains three distinct BigQuery datasets, with the upload logic implemented in [bigquery_upload.R](https://github.com/ChrisPachulski/the-pet-shop-easton/blob/main/R/bigquery_upload.R):
- `available_puppies`: Current inventory
- `pups_of_interest`: Tracked breeds (our future family members)
- `adopted`: Historical adoption records

Each dataset is organized with date-stamped tables, allowing for comprehensive historical analysis and trend identification - and helping me build a compelling case for why we need just one more dog from a responsible source.

## Automation and Scheduling

The entire system runs automatically through a cron job:

```bash
0 12 * * * Rscript /path/to/the-pet-shop-easton/main.R
```

This ensures daily updates and notifications without manual intervention, keeping me ready for any opportunity to show my wife that perfect puppy. The store opens at 11 AM EST and this time aligns with allowing staff to update the site in the morning &/or catch the prior day's updates.

## Conclusion

By combining R's data analysis capabilities with modern web technologies, cloud services, and AI-written puppy bios, I create a comprehensive system that not only satisfies my technical curiosity but also serves as my not so secret strategy in the ongoing quest to expand our pupper herd. Whether it's a dachshund's playful personality or a basset hound's adorable droopy ears (the wife loves those leg wrinkles), this system ensures I'm always ready with the perfect puppy to show my wife - breeder ID included, ready to look up. After all, who could resist those puppy eyes when presented with the perfect data-backed opportunity? The system's modular design allows for easy updates and modifications as our requirements evolve, making it a robust and maintainable solution for long-term use - and hopefully, long-term puppy tracking success!

Feel free to check out the [GitHub repository](https://github.com/ChrisPachulski/the-pet-shop-easton) for the complete source code, documentation, and to contribute to the project! 
