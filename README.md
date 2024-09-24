# Reference Data Service

This service is responsible for retrieving transport reference data from various sources including NaPTAN, NOC, NPTG, TNDS and BODS. It then exposes this data via an API.

## Tech Stack

This service is comprised of a number of data retrievers and data uploaders, these are all deployed using SST:

### Retrievers

-   CSV Retrievers
    -   TypeScript Lambdas responsible for retrieving the NOC, NaPTAN and NPTG data and storing it in an S3 bucket
-   TXC Retrievers
    -   Python Lambdas responsible for retrieving TXC data from TNDS and BODS and storing it in an S3 bucket

### Uploaders

-   CSV Uploader
    -   TypeScript Lambda responsible for uploading the CSV data to the central RDS Aurora database
-   TXC Uploader
    -   Python Lambda responsible for retrieving the relevant data from the TXC files and uploading it to the central RDS Aurora database

### Table Renamer

All data is initially imported into tables suffixed with "\_new", this TypeScript Lambda is responsible for renaming these tables after the data import jobs have completed. It also renames the current tables to have an "\_old" suffix.

## Running Locally

### Dependencies

-   Node 20+
-   Python3
-   AWS CLI
-   jq

### Running for the first time

When first running the application, a new stack will need to be deployed into AWS. First make sure you are authenticated against the desired AWS account and run the following:

-   `make install-deps start-sst`, this will install the npm and python dependencies and start sst, it will prompt you for a name for your dev stage

The first time this runs will take a bit longer than subsequent runs due to having to deploy the infrastructure.

### Subsequent runs

When running the application subsequent times, it can be started simply by running `make` or `make dev`.

### Importing data

The data import jobs can be triggered individually via make commands:

-   First import the bank holidays data by running `make trigger-bank-holidays-retriever`
-   Then import the CSV data, this can be done individually or all can be triggered at once by running `make trigger-all-csv-retrievers`
-   Import the NPTG data using `make trigger-nptg-retriever`
-   TXC data can all be imported by running `make trigger-bods-retriever` however this can take upwards of an hour
-   In order to test a single TXC file upload, run `make test-bods-uploader` or `make test-tnds-uploader`, this will upload a single `test.xml` file which can be updated as necessary
-   Trigger the table renamer to update the imported data to be in the main tables: `make trigger-table-renamer`, all of the data needs to be imported before this step
