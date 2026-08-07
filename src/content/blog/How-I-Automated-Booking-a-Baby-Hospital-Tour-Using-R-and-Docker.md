---
title: How I Automated Booking a Baby Hospital Tour Using R and Docker
date: 2021-10-02T04:00:00.000Z
featureImage: /st-lukes-hospital_resized.png
---

## Automated Baby Appointment Scheduling with R

When expecting our first child, my wife and I quickly realized just how fast appointments for hospital tours filled up, often within minutes of becoming available. My wife had her heart set on one hospital in particular and it was a fun realization that I could help out here. To ensure we didn't miss out (Classic FOMO), I developed an automated solution to ensure the booking process.

### What Does the Script Do?

The script begins by setting up a remote browser using RSelenium:

```r
# Connect to remote Selenium server (IP hidden for privacy)
IP = "xxx.xxx.xxx.xxx"
remDr = remoteDriver(remoteServerAddr = IP, port = 4445, browser = "chrome")
remDr$open()
remDr$maxWindowSize()
```

Next, it navigates directly to Saint Luke's appointment page to gather available booking links:

```r
remDr$navigate("https://www.slhn.org/womens/obstetrics/childbirth-and-pregnancy-classes/new-beginnings-tour")
html_info = remDr$getPageSource() %>% .[[1]] %>% read_html()
```

The script extracts available "Onsite New Beginnings Tour" appointments specifically for the Anderson Campus, storing these for historical reference:

```r
link_names = html_info %>% html_nodes("a") %>% 
    html_text() %>%
    as_tibble() %>%
    filter(grepl('Onsite New Beginnings Tour.*Anderson',value)) %>%
    rename(text_name = value)

url_info = html_info %>% html_nodes("a") %>% 
    html_attr('href') %>% 
    trimws() %>% 
    as_tibble() %>% 
    filter(grepl('onsite-new-beginnings-tour-anderson-campus',value)) %>%
    rename(link_url = value)

link_tbl = cbind(link_names, url_info)
link_tbl %>% write_csv('/home/cujo253/mines_of_moria/saint_lukes_baby_scheduling/historical_links.csv')
```

To prevent duplicate bookings, the script verifies if a prior attempt was successful:

```r
successfully_scheduled = read_csv('/home/cujo253/mines_of_moria/saint_lukes_baby_scheduling/confirmation.csv')
```

It then iterates through each available appointment, checks availability, and automates the completion of the booking form:

```r
if(successfully_scheduled$is_scheduled[1] == "No"){
    for(i in 1:nrow(link_tbl)){
        remDr$navigate(link_tbl$link_url[i])
        Sys.sleep(3)
        if(remDr$getTitle()[[1]][1] != "Leading CMMS System & Enterprise Asset Management Software"){
            sold_out_status_text = remDr$findElement('xpath','//*[@id="registration-data"]/div/table/tbody/tr[1]/td[6]/span')$getElementText() %>% unlist()
            
            if(sold_out_status_text != "Sold Out"){
                # Fill out personal details in the form (example shown below)
                quantity_field = remDr$findElement('xpath','//*[@id="quantity_1"]')
                quantity_field$clickElement()
                quantity_field$sendKeysToElement(list('2'))
                # (More form-filling code omitted for brevity)
                
                remDr$findElement('xpath','//*[@id="lbtnContinue"]')$clickElement()

                successfully_scheduled = as_tibble(data.frame(is_scheduled = "yes"))
                successfully_scheduled %>% write_csv('/home/cujo253/mines_of_moria/saint_lukes_baby_scheduling/confirmation.csv')
            }
        }
    }
}
```

### Docker Setup for RSelenium

To run this script, you must first install Docker and pull the Selenium Docker container:

1. **Install Docker**:

* [Docker Desktop](https://www.docker.com/products/docker-desktop) (Windows/Mac)
* Docker Engine via package manager (Linux):

```bash
sudo apt update
sudo apt install docker.io
```

1. **Pull the Selenium Docker image**:

```bash
docker pull selenium/standalone-chrome:latest
```

1. **Run the Selenium Docker container**:

```bash
docker run -d -p 4445:4444 selenium/standalone-chrome:latest
```

This command will create a Selenium standalone server on your local machine, accessible via the specified port (4445).

### Why Use This Script?

Given how swiftly available appointments disappeared, automating this task significantly increased our chances of securing a spot. It minimized the risk of manual error, ensuring reliable data entry, and provided us with peace of mind, allowing my wife to focus on her pregnancy instead of appointment logistics.

### Technologies Used

* **R**: Orchestrates data extraction and browser automation.
* **RSelenium**: Automates browser interactions, mimicking human actions precisely.
* **tidyverse**: Facilitates data handling and storage.
* **Docker**: Simplifies the setup and management of Selenium server environments.

This script highlights practical automation, blending personal need (and a bit of showing off for the wife) with technical capability to ensure an essential and comforting experience for our growing family.
