#!/bin/bash

cd "$(dirname "$0")"

pushd ../infra/environments/test
terraform apply -auto-approve > /dev/null 2>&1
STAGING_BUCKET_NAME=$(terraform output -raw staging_bucket_name)
popd

aws s3 sync ./test_images s3://$STAGING_BUCKET_NAME/

source venv/bin/activate
python populate_test_table.py "$@"
