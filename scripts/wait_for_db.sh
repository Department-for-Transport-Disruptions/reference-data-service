#!/bin/sh

STAGE=$(cat .sst/stage)
DB_CLUSTER_ARN=$(aws rds describe-db-clusters | jq -r --arg stage $STAGE '.DBClusters[] | select(.TagList[] | select((.Key=="sst:stage") and (.Value==$stage))).DBClusterArn')
SECRET_ARN=$(aws secretsmanager list-secrets | jq -r --arg stage $STAGE '.SecretList[] | select(.Tags[]? | select(.Key=="sst:stage" and .Value==$stage))' | jq -r '. | select(.Tags[]? | select(.Key=="sst:app" and .Value=="reference-data-service"))'.ARN)

check_db() {
    aws rds-data execute-statement --secret-arn $SECRET_ARN --resource-arn $DB_CLUSTER_ARN --sql "SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = 'ref_data'" > /dev/null 2>&1
}

until check_db
do
    echo "Waiting for database to be available..."
    sleep 5
done

echo "The database is available!"
