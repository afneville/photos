#!/bin/bash

cd "$(dirname "$0")"

pushd ../infra/environments/test
terraform apply -auto-approve > /dev/null 2>&1

popd
source venv/bin/activate
python populate_test_table.py "$@"
