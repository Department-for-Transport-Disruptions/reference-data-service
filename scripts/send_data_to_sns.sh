#!/bin/bash

if [ "$#" -lt 1 ]; then
    echo "Usage: $0 <extract_path> [year]"
    exit 1
fi

EXTRACT_PATH="$1"

CURRENT_YEAR=$(date +"%Y")
YEAR="${2:-$CURRENT_YEAR}"

BASE_URL="https://opendata.manage-roadworks.service.gov.uk/permit/$YEAR"
SNS_TOPIC_ARN="arn:aws:sns:region:account-id:your-topic-name"

# Months you want to download and process
MONTHS=("01" "02") # Update this array if you want to process more months

for month in "${MONTHS[@]}"; do
    echo "Creating folder for street manager data..."
    mkdir "$EXTRACT_PATH/street-manager-data"
    
    ZIP_FILE_URL="$BASE_URL/$month.zip"
    ZIP_FILE="$EXTRACT_PATH/street-manager-data/$month.zip"
    FIXED_ZIP_PATH="$EXTRACT_PATH/street-manager-data/$month-fixed.zip"

    echo "Downloading $ZIP_FILE_URL..."
    wget "$ZIP_FILE_URL" -O "$ZIP_FILE" || curl -o "$ZIP_FILE" "$ZIP_FILE_URL"

    echo "Correcting $ZIP_FILE_URL..."
    zip -FF $ZIP_FILE --out $FIXED_ZIP_PATH

    echo "Extracting $FIXED_ZIP_PATH to $EXTRACT_PATH/street-manager-data..."
    unzip -q -o "$FIXED_ZIP_PATH" -d"$EXTRACT_PATH/street-manager-data"

    FILES="$EXTRACT_PATH/street-manager-data/*"
    for f in $FILES; do
        if [ -f "$f" ]; then

            message=$(cat "$f")

            echo "Publishing $f to SNS..."
            aws sns publish --topic-arn "$SNS_TOPIC_ARN" --message "$message"
            
            if [ $? -eq 0 ]; then
                echo "Successfully sent notification for $f"
            else
                echo "Failed to send notification for $f"
            fi
        fi
    done

    rm -rf $FIXED_ZIP_PATH
    rm -rf $ZIP_FILE
done

echo "Done processing all ZIP files."
