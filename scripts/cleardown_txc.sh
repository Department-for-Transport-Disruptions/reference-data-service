#!/bin/sh

STAGE=$(cat .sst/stage)
DB_CLUSTER_ARN=$(aws rds describe-db-clusters | jq -r --arg stage $STAGE '.DBClusters[] | select(.TagList[] | select((.Key=="sst:stage") and (.Value==$stage))).DBClusterArn')
SECRET_ARN=$(aws secretsmanager list-secrets | jq -r --arg stage $STAGE '.SecretList[] | select(.Tags[]? | select(.Key=="sst:stage" and .Value==$stage))' | jq -r '. | select(.Tags[]? | select(.Key=="sst:app" and .Value=="reference-data-service"))'.ARN)

declare -a arr=("service_journey_pattern_links" "service_admin_area_codes" "vehicle_journeys" "service_journey_patterns" "tracks" "services")

echo "Clearing down TXC tables..."

for i in "${arr[@]}"
do
    aws rds-data execute-statement --secret-arn $SECRET_ARN --resource-arn $DB_CLUSTER_ARN --sql "DROP TABLE IF EXISTS ref_data.${i}_new" > /dev/null
    aws rds-data execute-statement --secret-arn $SECRET_ARN --resource-arn $DB_CLUSTER_ARN --sql "CREATE TABLE ref_data.${i}_new LIKE ref_data.${i}" > /dev/null
done



