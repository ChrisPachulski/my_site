---
title: 'Pet Shop Monitoring with R'
date: 2025-04-27T04:00:00.000Z
featureImage: /R_logo_resized.png
---

As a proud owner of three wonderful dachshunds (Ruby, Moose, & Poppy) and a data guy by profession, I find myself in a familiar predicament: I want to add a fourth furry friend to our family, specifically a dachshund or basset hound. My wife, however, needs some convincing. So, I decide to combine my love for pets with my technical skills to create a sophisticated R-based automation system that helps me track available puppies at The Pet Shop Easton. In this blog post, I'll share how I build a comprehensive monitoring solution that not only satisfies my data analysis curiosity but also serves as my not so secret strategy in the ongoing "fourth dog" negotiations with my wife.

In my never ending endeavor to annoy and inspire eye rolls - I also realized I will be able to track overall adoptions, breed preferences, breeder frequency, and overall volume at this location. Apparently - creating this makes me "extra" - but I've decided to take that as a compliment.

### Setting Up the Analytical Environment

My automation workflow begins with a carefully curated set of R packages that provide all the necessary functionality:

```r
pacman::p_load(tidyverse, rvest, janitor, httr, readxl, bigrquery, googleAuthR, lubridate, cronR, shinyFiles, gmailr, openai)
```

This toolkit enables everything from web scraping to cloud database integration, email notifications, and AI-powered breeder analysis, forming the backbone of my automation system.

### Database Integration

To maintain a historical record of puppy availability (and build my case for that perfect fourth dog), I implement Google BigQuery integration:

```r
con = authenticate_bq_and_google()
```

This connection allows me to store and analyze data across multiple datasets, tracking available puppies, those of interest, and adoption patterns over time.

### Web Scraping Implementation

The core of my system involves automated data collection from The Pet Shop Easton's website, specifically looking for those adorable dachshunds and basset hounds:

```r
url = "https://thepetshopinc.com/available-puppies"
raw_puppy_data = fetch_all_puppy_details(url)
parsed_puppy_data = parse_puppy_details(raw_puppy_data)
```

This automated scraping process captures detailed information about each available puppy, including breed, age, price, images, and crucially, breeder IDs - perfect for those "look how cute!" moments with my wife, but also essential for responsible pet adoption.

### Breeder Vetting and GPT Integration

One of the most important aspects of my system is the breeder vetting process. I've discovered that not all breeders are created equal, and it's crucial to investigate their backgrounds:

```r
breeder_ids = extract_breeder_ids(parsed_puppy_data)
breeder_analysis = analyze_breeders_with_gpt(breeder_ids)
```

I've integrated GPT to help analyze breeder information by:
- Cross-referencing breeder IDs with public databases
- Checking for any red flags in breeder history
- Verifying breeding practices and facility conditions
- Identifying patterns of puppy mill activity
- Tracking breeder reputation over time

This AI-powered analysis helps ensure that any potential new family member comes from a responsible source, which is crucial for both ethical reasons and my wife's peace of mind.

### Data Processing and Analysis

I implement sophisticated data cleaning and analysis pipelines, with a special focus on our breeds of interest:

```r
breed_regex = "(dachs|basset)"
pups_of_interest = filter_puppies_by_breed(parsed_puppy_data, breed_regex)
pups_of_interest = filter_by_breeder_quality(pups_of_interest, breeder_analysis)
```

This filtering system helps me stay focused on the breeds that would make the perfect addition to our family, while maintaining comprehensive data on all available puppies and ensuring they come from reputable sources.

### Adoption Detection

One of the most valuable features I implement is automated adoption detection:

```r
detect_adoptions(con, table_header = "puppies")
```

This system compares consecutive days' data to identify which puppies have been adopted, helping me understand how quickly these adorable pups find their forever homes - and ensuring I don't miss any opportunities to show my wife that perfect puppy from a responsible breeder.

### Interest Tracking System

I develop a sophisticated tracking system for puppies of interest:

```r
alert_me_pups = track_and_upload_pups_of_interest(pups_of_interest, con)
```

This system maintains a running count of how many consecutive days each puppy has been available, helping me identify new arrivals and long-term residents - perfect for those "they've been waiting for a home" conversations, while also tracking their breeder's reputation.

### Automated Notifications

To ensure I never miss a new puppy of interest (and can promptly show my wife), I implement an email notification system:

```r
if (nrow(alert_me_pups) > 0) {
  email_body = create_email_content(alert_me_pups, breed_regex, breeder_analysis)
  send_email_alert(
    subject = paste0(Sys.Date(), " Puppy Breed Alert"),
    email_content = email_body
  )
}
```

This system automatically sends detailed alerts when new puppies matching our criteria become available, giving me the perfect opportunity to casually mention, "Oh, look what just became available..." along with their breeder's verified reputation.

### Data Storage and Organization

My system maintains three distinct BigQuery datasets:
- `available_puppies`: Current inventory
- `pups_of_interest`: Tracked breeds (our future family members)
- `adopted`: Historical adoption records
- `breeder_analysis`: Comprehensive breeder reputation tracking

Each dataset is organized with date-stamped tables, allowing for comprehensive historical analysis and trend identification - and helping me build a compelling case for why we need just one more dog from a responsible source.

### Automation and Scheduling

The entire system runs automatically through a cron job:

```bash
0 12 * * * Rscript /path/to/the-pet-shop-easton/main.R
```

This ensures daily updates and notifications without manual intervention, keeping me ready for any opportunity to show my wife that perfect puppy from a verified responsible breeder. The store opens at 11 AM EST and this time aligns with allowing staff to update the site in the morning &/or catch the prior days updates

### Conclusion

By combining R's data analysis capabilities with modern web technologies, cloud services, and AI-powered breeder vetting, I create a comprehensive system that not only satisfies my technical curiosity but also serves as my not so secret strategy in the ongoing quest to expand our pupper herd. Whether it's a dachshund's playful personality or a basset hound's adorable droopy ears (the wife loves those leg wrinkles), this system ensures I'm always ready with the perfect puppy to show my wife - and the peace of mind that comes from knowing they come from responsible breeders. After all, who could resist those puppy eyes when presented with the perfect data-backed opportunity from a verified source? The system's modular design allows for easy updates and modifications as our requirements evolve, making it a robust and maintainable solution for long-term use - and hopefully, long-term puppy tracking success! 
