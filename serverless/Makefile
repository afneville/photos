STAGING_BUCKET_NAME = $(shell cd ../infra/environments/test && terraform output -raw staging_bucket_name)
PROCESSED_BUCKET_NAME = $(shell cd ../infra/environments/test && terraform output -raw processed_bucket_name)
TEST_DATA_IMAGE = $(shell find test_data/test_images -type f | head -1 | sed 's|test_data/test_images/||')
TEST_DATA_VENV := test_data/venv
TEST_DATA_PYTHON := $(TEST_DATA_VENV)/bin/python
TEST_DATA_PIP := $(TEST_DATA_VENV)/bin/pip

.PHONY: help build test-local generate-test-event clean setup-test-infra populate-test-data clear-test-data process-test-data teardown-test-infra

help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

build:
	sam build --use-container

generate-test-event:
	mkdir -p events
	BUCKET=$$(cd ../infra/environments/test && terraform output -raw staging_bucket_name); \
	sam local generate-event s3 put --bucket "$$BUCKET" --key $(TEST_DATA_IMAGE) > events/s3-put-event.json

generate-lambda-env:
	mkdir -p .
	BUCKET=$$(cd ../infra/environments/test && terraform output -raw processed_bucket_name); \
	echo '{"ImageProcessorFunction":{"SERVING_BUCKET":"'$$BUCKET'"}}' > env.json

test-lambda: build generate-test-event generate-lambda-env
	sam local invoke ImageProcessorFunction -e events/s3-put-event.json --env-vars env.json

clean:
	rm -rf .aws-sam/
	rm -rf events/
	rm -rf env.json
	rm -rf image_processor/venv/

setup-test-infra:
	cd ../infra/environments/test && terraform apply -auto-approve
	cd ../infra/environments/test && aws s3 sync ../../../serverless/test_data/test_images s3://$$(terraform output -raw staging_bucket_name)/

teardown-test-infra:
	cd ../infra/environments/test && terraform destroy -auto-approve

populate-test-data: $(TEST_DATA_VENV) setup-test-infra
	$(TEST_DATA_PYTHON) test_data/populate_test_table.py

clear-test-data: $(TEST_DATA_VENV)
	$(TEST_DATA_PYTHON) test_data/populate_test_table.py clear
	cd ../infra/environments/test && aws s3 rm s3://$$(terraform output -raw staging_bucket_name) --recursive
	cd ../infra/environments/test && aws s3 rm s3://$$(terraform output -raw processed_bucket_name) --recursive

process-test-data: build generate-lambda-env setup-test-infra populate-test-data
	@BUCKET=$$(cd ../infra/environments/test && terraform output -raw staging_bucket_name); \
	for image in $$(find test_data/test_images -type f | sed 's|test_data/test_images/||'); do \
		sam local generate-event s3 put --bucket "$$BUCKET" --key "$$image" > events/test-event.json; \
		sam local invoke ImageProcessorFunction -e events/test-event.json --env-vars env.json; \
	done
	@rm -f events/test-event.json

$(TEST_DATA_VENV):
	python3 -m venv $(TEST_DATA_VENV)
	$(TEST_DATA_PIP) install -r test_data/requirements.txt
