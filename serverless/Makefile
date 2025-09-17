STAGING_BUCKET_NAME = $(shell cd ../infra/environments/test && terraform output -raw staging_bucket_name)
PROCESSED_BUCKET_NAME = $(shell cd ../infra/environments/test && terraform output -raw processed_bucket_name)
DYNAMODB_TABLE_NAME = $(shell cd ../infra/environments/test && terraform output -raw dynamodb_table_name)
ECR_REPOSITORY_URL = $(shell cd ../infra/environments/test && terraform output -raw ecr_repository_url)
LAMBDA_FUNCTION_NAME = $(shell cd ../infra/environments/test && terraform output -raw lambda_function_name)
AWS_REGION = eu-west-2
TEST_DATA_IMAGE = $(shell find test_data/test_images -type f | head -1 | sed 's|test_data/test_images/||')
TEST_DATA_VENV := test_data/venv
TEST_DATA_PYTHON := $(TEST_DATA_VENV)/bin/python
TEST_DATA_PIP := $(TEST_DATA_VENV)/bin/pip

.PHONY: help build build-container push-container update-lambda test-local generate-test-event clean setup-test-infra populate-test-data clear-test-data process-test-data teardown-test-infra ecr-login

help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

build: ## Build Lambda function using SAM
	sam build --use-container

build-container: ## Build Lambda container image using SAM
	sam build

ecr-login: ## Login to ECR
	aws ecr get-login-password --region $(AWS_REGION) | docker login --username AWS --password-stdin $(ECR_REPOSITORY_URL)

push-container: build-container ecr-login ## Build and push container to ECR
	$(eval IMAGE_TAG := $(shell date +%Y%m%d-%H%M%S))
	docker tag imageprocessorfunction:latest $(ECR_REPOSITORY_URL):$(IMAGE_TAG)
	docker tag imageprocessorfunction:latest $(ECR_REPOSITORY_URL):latest
	docker push $(ECR_REPOSITORY_URL):$(IMAGE_TAG)
	docker push $(ECR_REPOSITORY_URL):latest
	@echo "Pushed image with tag: $(IMAGE_TAG)"

update-lambda: push-container ## Update Lambda function with new container image
	aws lambda update-function-code \
		--function-name $(LAMBDA_FUNCTION_NAME) \
		--image-uri $(ECR_REPOSITORY_URL):latest \
		--region $(AWS_REGION)

deploy-lambda: push-container update-lambda ## Deploy Lambda container to AWS

generate-test-event:
	mkdir -p events
	BUCKET=$$(cd ../infra/environments/test && terraform output -raw staging_bucket_name); \
	sam local generate-event s3 put --bucket "$$BUCKET" --key $(TEST_DATA_IMAGE) > events/s3-put-event.json

generate-lambda-env:
	mkdir -p .
	BUCKET=$$(cd ../infra/environments/test && terraform output -raw processed_bucket_name); \
	TABLE=$$(cd ../infra/environments/test && terraform output -raw dynamodb_table_name); \
	echo '{"ImageProcessorFunction":{"SERVING_BUCKET":"'$$BUCKET'","DYNAMODB_TABLE_NAME":"'$$TABLE'"}}' > env.json

test-lambda: build generate-test-event generate-lambda-env
	sam local invoke ImageProcessorFunction -e events/s3-put-event.json --env-vars env.json

clean:
	rm -rf .aws-sam/
	rm -rf events/
	rm -rf env.json
	rm -rf image_processor/venv/

setup-test-infra: ## Deploy all infrastructure including placeholder Lambda
	cd ../infra/environments/test && terraform apply -auto-approve

teardown-test-infra: clear-test-data
	cd ../infra/environments/test && terraform destroy -auto-approve

populate-test-data: $(TEST_DATA_VENV) setup-test-infra
	cd ../infra/environments/test && aws s3 sync ../../../serverless/test_data/test_images s3://$$(terraform output -raw staging_bucket_name)/
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
