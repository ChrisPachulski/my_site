---
title: 'Bash Fun: Download Folder File Organizer'
date: 2024-05-04T04:00:00.000Z
---

Organizing files manually can be tedious, especially when your Downloads folder quickly fills up with a mixture of files downloaded over different days. Automating this process saves time and keeps your digital space tidy. In this blog, we'll explore a concise yet powerful shell script named download\_clean.sh designed to automate organizing downloaded files.

## Overview:

The download\_clean.sh script is a very simple but effective Bash script created to organize files in the Downloads folder automatically. It groups files based on their creation dates, moving them into appropriately labeled directories.

```shell
#!/bin/bash

# Define the path to the Downloads folder
DOWNLOADS_FOLDER="$HOME/Downloads"

# Get today's date in YYYY-MM-DD format
TODAY=$(date "+%Y-%m-%d")

# Change directory to the Downloads folder
cd "$DOWNLOADS_FOLDER"

# Iterate over each file in the Downloads folder
for file in *; do
    # Check if the item is a file (skip directories)
    if [ -f "$file" ]; then
        # Get the creation date of the file
        date=$(stat -f "%SB" -t "%Y-%m-%d" "$file")

        # Skip the file if its creation date is today
        if [ "$date" = "$TODAY" ]; then
            continue
        fi
        
        # Create a directory with the creation date, if it doesn't already exist
        mkdir -p "$date"
        
        # Move the file into the corresponding directory
        mv "$file" "$date/"
    fi
done

# Confirmation message
echo "Files created prior to today have been organized by their creation date."
```

### Breakdown of Commands and Logic:

* Setting the Downloads Directory:
* The script defines the Downloads directory using the user's home folder path.
* Capturing Current Date:
* It captures today's date to prevent moving files downloaded on the current day.
* Iterating Over Files:
* A loop processes each file individually, ensuring directories are excluded.
* Determining File Dates:
* stat command retrieves each file's creation date, formatted consistently.
* Conditional Logic:
* Files downloaded on the current day remain untouched, preserving easy access to recent downloads.
* File Organization:
* Older files are moved into directories named after their creation dates, automatically creating these directories if necessary.

## Practical Benefits

* Automated Organization: Frees up manual sorting time and ensures consistency.
* Reduced Clutter: Keeps the Downloads folder clean and manageable.
* Ease of Retrieval: Organizing by date makes finding past downloads straightforward.

## Conclusion

Shell scripting offers powerful and accessible solutions to automate everyday tasks. The download\_clean.sh script exemplifies efficiency through simplicity. By implementing this approach, you streamline your workflow, maintain organization, and enhance productivity with minimal effort. I actually mirrored this folder creation off of how I structured the BigQuery datasets for MTGBAN, somewhat ironically mimicking SQL table structures in local file pathing. Setting this up on an internal cron job is also something I would recommend - as then you never have to think about it again.
