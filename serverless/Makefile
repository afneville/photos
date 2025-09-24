STAGING_BUCKET_NAME = $(shell cd ../infra/environments/test && terraform output -raw staging_bucket_name)
PROCESSED_BUCKET_NAME = $(shell cd ../infra/environments/test && terraform output -raw processed_bucket_name)
DYNAMODB_TABLE_NAME = $(shell cd ../infra/environments/test && terraform output -raw dynamodb_table_name)
ECR_REPOSITORY_URL = $(shell cd ../infra/environments/test && terraform output -raw ecr_repository_url)
LAMBDA_FUNCTION_NAME = $(shell cd ../infra/environments/test && terraform output -raw lambda_function_name)
ECR_REPOSITORY_NAME = $(shell cd ../infra/environments/test && terraform output -raw image_processor_ecr_repository_name)
COGNITO_USER_POOL_ID = $(shell cd ../infra/environments/test && terraform output -raw cognito_user_pool_id)
COGNITO_USER_POOL_CLIENT_ID = $(shell cd ../infra/environments/test && terraform output -raw cognito_user_pool_client_id)
AWS_REGION = eu-west-2
TEST_DATA_IMAGE = $(shell find test_data/test_images -type f | head -1 | sed 's|test_data/test_images/||')
TEST_DATA_VENV := test_data/venv
TEST_DATA_PYTHON := $(TEST_DATA_VENV)/bin/python
TEST_DATA_PIP := $(TEST_DATA_VENV)/bin/pip

.PHONY: help build build-container push-container update-lambda test-local generate-test-event clean setup-test-infra populate-test-data clear-test-data process-test-data teardown-test-infra ecr-login create-admin-user delete-admin-user generate-env

help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

build:
	sam build --use-container

build-container:
	sam build

ecr-login:
	aws ecr get-login-password --region $(AWS_REGION) | docker login --username AWS --password-stdin $(ECR_REPOSITORY_URL)

push-container: build-container ecr-login
	$(eval IMAGE_TAG := $(shell date +%Y%m%d-%H%M%S))
	docker tag imageprocessorfunction:latest $(ECR_REPOSITORY_URL):$(IMAGE_TAG)
	docker tag imageprocessorfunction:latest $(ECR_REPOSITORY_URL):latest
	docker push $(ECR_REPOSITORY_URL):$(IMAGE_TAG)
	docker push $(ECR_REPOSITORY_URL):latest
	@echo "Pushed image with tag: $(IMAGE_TAG)"

update-lambda: push-container
	aws lambda update-function-code \
		--function-name $(LAMBDA_FUNCTION_NAME) \
		--image-uri $(ECR_REPOSITORY_URL):latest \
		--region $(AWS_REGION)

deploy-lambda: push-container update-lambda

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

setup-test-infra:
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
	@echo "Clearing ECR repositories..."
	@aws ecr list-images --repository-name $(ECR_REPOSITORY_NAME) --region $(AWS_REGION) --query 'imageIds[*]' --output json | \
	aws ecr batch-delete-image --repository-name $(ECR_REPOSITORY_NAME) --region $(AWS_REGION) --image-ids file:///dev/stdin || echo "No images to delete in image processor repo"

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

create-admin-user:
	@if [ -z "$(ADMIN_EMAIL)" ]; then \
		echo "Error: ADMIN_EMAIL environment variable is required"; \
		exit 1; \
	fi
	@if [ -z "$(ADMIN_PASSWORD)" ]; then \
		echo "Error: ADMIN_PASSWORD environment variable is required"; \
		exit 1; \
	fi
	@echo "Creating admin user $(ADMIN_EMAIL) in user pool $(COGNITO_USER_POOL_ID)..."
	aws cognito-idp admin-create-user \
		--user-pool-id $(COGNITO_USER_POOL_ID) \
		--username $(ADMIN_EMAIL) \
		--user-attributes Name=email,Value=$(ADMIN_EMAIL) Name=email_verified,Value=true \
		--message-action SUPPRESS \
		--region $(AWS_REGION)
	@echo "Setting permanent password for user..."
	aws cognito-idp admin-set-user-password \
		--user-pool-id $(COGNITO_USER_POOL_ID) \
		--username $(ADMIN_EMAIL) \
		--password $(ADMIN_PASSWORD) \
		--permanent \
		--region $(AWS_REGION)
	@echo "Admin user $(ADMIN_EMAIL) created successfully!"

delete-admin-user:
	@if [ -z "$(ADMIN_EMAIL)" ]; then \
		echo "Error: ADMIN_EMAIL environment variable is required"; \
		exit 1; \
	fi
	@echo "Deleting admin user $(ADMIN_EMAIL) from user pool $(COGNITO_USER_POOL_ID)..."
	aws cognito-idp admin-delete-user \
		--user-pool-id $(COGNITO_USER_POOL_ID) \
		--username $(ADMIN_EMAIL) \
		--region $(AWS_REGION)
	@echo "Admin user $(ADMIN_EMAIL) deleted successfully!"

generate-env:
	@echo "Generating .env file from terraform outputs..."
	@echo "STAGING_BUCKET=$(STAGING_BUCKET_NAME)" > ../.env
	@echo "CLOUD_REGION=$(AWS_REGION)" >> ../.env
	@echo "DYNAMODB_TABLE=$(DYNAMODB_TABLE_NAME)" >> ../.env
	@echo "PHOTO_GALLERY_ID=test-gallery" >> ../.env
	@echo "IMAGE_DOMAIN=$$(cd ../infra/environments/test && terraform output -raw image_serving_endpoint)" >> ../.env
	@echo "COGNITO_USER_POOL_ID=$(COGNITO_USER_POOL_ID)" >> ../.env
	@echo "COGNITO_CLIENT_ID=$(COGNITO_USER_POOL_CLIENT_ID)" >> ../.env
	@echo "ORIGIN=http://localhost:3000" >> ../.env
	@echo "✅ Generated .env file with terraform outputs"
