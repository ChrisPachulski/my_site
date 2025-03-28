---
title: 'Bash Fun: Full On Sync & Setup For Mac '
date: 2024-02-06T05:00:00.000Z
featureImage: /full_colored_light.png
---

This past Black Friday (the most important time of the year in digital advertising) - I made the genius move to close my laptop down on a Starbucks chew stick. This catastrophic event had the spectacular effect of rendering my screen completely unusable. I therefor had to get my local Desktop set up for the tasks at hand - and in doing so vowed to avoid this struggle at all costs again in the future. The \[shell script I created]\([https://github.com/ChrisPachulski/sync\_and\_setup/blob/main/sync\_and\_setup.sh](https://github.com/ChrisPachulski/sync_and_setup/blob/main/sync_and_setup.sh)) was thus an attempt to ensure that I (or anyone else on my team) would not need to suffer this pain again. Put simply - the script performs the following functions:

```shell
main() {
  ensure_software_installed
  install_anaconda
  update_etl_repository
  localize_repo_pathing
  extract_repo_scripts_from_shells
  retrieve_keys_from_jumpdrive
  prepare_docker_environment
  setup_python_environment
  check_and_install_R
  install_slack
  install_outlook

    echo "Setup and synchronization complete."
}
```

## Overview of sync\_and\_setup.sh

The sync\_and\_setup.sh script is a comprehensive Bash script designed to automate software installations, environment configurations, repository synchronization, and container management, ensuring your local environment matches production standards closely.

## Key Technical Components Explained

Here's a high-level breakdown of the script's functionality and commands:

### 1. Environment and Path Setup

* Establishes essential directories like ETL\_DIR, KEY\_DIR, and STAGING\_DIR.
* Defines remote paths for key synchronization and staging areas.

### 2. Package Installation Automation

* Detects operating system (macOS or Linux) and conditionally installs required packages such as Docker, Git, PostgreSQL, Vim, and Rsync.
* Automates Docker installation and configuration to handle internal registries.

### 3. Anaconda Environment Setup

* Automates the installation of Miniconda if not already present.
* Creates and configures a Conda environment named current\_staging\_environ based on Python dependencies extracted from a Docker image.
* Dynamically handles environment variable setups and activations to mirror Airflow environments.

### 4. Git Repository Management

* Automatically clones or updates the ETL repository.
* Ensures secure and consistent access by configuring Git to use SSH.
* Provides automated instructions for SSH key generation and configuration if necessary.

### 5. File and Directory Synchronization

* Utilizes rsync to synchronize crucial keys and staging files from remote servers, providing fallback scripts for manual setup if needed.
*
* Extracts all Python and R scripts nested inside Shell scripts for easy REPL testing and updating

### 6. Docker Management and Dependency Extraction

* Manages Docker images, checking for updates and pulling the latest containers as needed.
* Extracts Python and R dependencies from Docker containers to ensure local environment consistency.

### 7. Script Localization and Management

* Adjusts script paths dynamically for local execution, converting production script paths to local equivalents using embedded Python scripting.
* Extracts embedded Python and R scripts from shell scripts for separate execution and management.

### 8. R and Reticulate Integration

* Automates R installation and configuration on both macOS and Linux.
* Integrates Reticulate for seamless Python execution within R, enhancing interoperability between R and Python environments.

### 9. Additional Software Automation

* Automates the installation of productivity tools such as Slack and Microsoft Outlook on macOS.

## Practical Benefits

* Consistency: Ensures uniform setups across all developer environments, closely matching production.
* Efficiency: Significantly reduces manual setup time and potential for human error.
* Scalability: Easy adaptation to various environments or projects through minimal script adjustments.
* Productivity: Enhances developer efficiency by automating tedious setup processes.

## Conclusion

The sync\_and\_setup.sh script is a robust tool that exemplifies the power of automation through shell scripting. It consolidates numerous manual configuration steps into a streamlined, repeatable process. Adopting such automation in your development environment promotes consistency, efficiency, and reliability, allowing teams to focus more on development and less on setup. 

Probably the most fun I've had shell scripting. I have plans to make a personal version of this going forward - wherein instead of a Docker container being the source of dependencies it will be a private repository. That transformation should actually simplify a number of elements here.
