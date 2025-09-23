.PHONY: format check test build-image extract-client strip-client upload-client clean help \
       deploy push-web-app push-image-processor sync-client \
       ecr-login update-web-app update-image-processor create-admin-user delete-admin-user

# Variables
IMAGE_NAME := photo-gallery
BUILDER_IMAGE := $(IMAGE_NAME)-builder
CLIENT_DIR := ./dist/client
AWS_REGION := eu-west-2
ENVIRONMENT ?= prod

# Helper function to get terraform outputs
get_terraform_output = $(shell cd infra/environments/$(1) && terraform output -raw $(2) 2>/dev/null || echo "")

# Default target
help:
	@echo "Available targets:"
	@echo ""
	@echo "Development:"
	@echo "  format              - Format code with prettier"
	@echo "  check               - Run svelte-check and linting"
	@echo "  test                - Run vitest tests"
	@echo "  all                 - Run format, check, test, build-image"
	@echo ""
	@echo "Build:"
	@echo "  build-image         - Build Docker image with client extraction"
	@echo "  extract-client      - Extract client files from builder image"
	@echo "  strip-client        - Build final image without client files"
	@echo ""
	@echo "Deployment (defaults to prod, override with ENVIRONMENT=test):"
	@echo "  deploy              - Deploy to environment"
	@echo "  push-web-app        - Build and push web app image to ECR"
	@echo "  push-image-processor- Build and push image processor to ECR"
	@echo "  sync-client         - Sync client files to S3 bucket"
	@echo "  update-web-app      - Update Lambda with latest image"
	@echo "  update-image-processor - Update image processor Lambda"
	@echo ""
	@echo "Utility:"
	@echo "  clean               - Clean up temporary files and images"
	@echo "  ecr-login           - Login to ECR"
	@echo ""
	@echo "Admin User Management (requires ADMIN_EMAIL and ADMIN_PASSWORD env vars):"
	@echo "  create-admin-user   - Create admin user in environment"
	@echo "  delete-admin-user   - Delete admin user from environment"

# Code quality targets
format:
	npm run format

check:
	npm run check
	npm run lint

test:
	npm run test

# Docker build targets
build-image: extract-client strip-client

extract-client:
	docker build --target builder -t $(BUILDER_IMAGE) .
	rm -rf $(CLIENT_DIR) 2>/dev/null || sudo rm -rf $(CLIENT_DIR)
	mkdir -p $(CLIENT_DIR)
	docker run --rm -v $(PWD)/$(CLIENT_DIR):/output $(BUILDER_IMAGE) \
		sh -c "cp -r /app/build/client/* /output/ 2>/dev/null || cp -r /app/build/_app /output/ || echo 'Client files extracted'"
	sudo chown -R $(USER):$(USER) $(CLIENT_DIR)

strip-client:
	docker build --target runtime -t $(IMAGE_NAME) .

# ECR Login target
ecr-login:
	$(eval ECR_REGISTRY := $(shell echo "$(call get_terraform_output,$(ENVIRONMENT),web_app_ecr_repository_url)" | cut -d'/' -f1))
	@aws ecr get-login-password --region $(AWS_REGION) | docker login --username AWS --password-stdin $(ECR_REGISTRY)

# Web App deployment targets
push-web-app: build-image
	$(eval WEB_APP_ECR_URL := $(call get_terraform_output,$(ENVIRONMENT),web_app_ecr_repository_url))
	@test -n "$(WEB_APP_ECR_URL)" || (echo "❌ Web app ECR URL not found for $(ENVIRONMENT)" && exit 1)
	$(eval IMAGE_TAG := $(shell date +%Y%m%d-%H%M%S))
	make ecr-login
	docker tag $(IMAGE_NAME):latest $(WEB_APP_ECR_URL):$(IMAGE_TAG)
	docker tag $(IMAGE_NAME):latest $(WEB_APP_ECR_URL):latest
	docker push $(WEB_APP_ECR_URL):$(IMAGE_TAG)
	docker push $(WEB_APP_ECR_URL):latest

# Image Processor deployment targets
push-image-processor:
	$(eval IMAGE_PROCESSOR_ECR_URL := $(call get_terraform_output,$(ENVIRONMENT),ecr_repository_url))
	@test -n "$(IMAGE_PROCESSOR_ECR_URL)" || (echo "❌ Image processor ECR URL not found for $(ENVIRONMENT)" && exit 1)
	$(eval IMAGE_TAG := $(shell date +%Y%m%d-%H%M%S))
	cd serverless && sam build --use-container
	make ecr-login
	docker tag imageprocessorfunction:latest $(IMAGE_PROCESSOR_ECR_URL):$(IMAGE_TAG)
	docker tag imageprocessorfunction:latest $(IMAGE_PROCESSOR_ECR_URL):latest
	docker push $(IMAGE_PROCESSOR_ECR_URL):$(IMAGE_TAG)
	docker push $(IMAGE_PROCESSOR_ECR_URL):latest

# Client sync targets (sync _app with --delete, copy other files without --delete)
sync-client: extract-client
	@test -d $(CLIENT_DIR) || (echo "❌ Client files not found. Run 'make extract-client' first" && exit 1)
	$(eval BUCKET := $(call get_terraform_output,$(ENVIRONMENT),processed_bucket_name))
	@test -n "$(BUCKET)" || (echo "❌ Bucket name not found for $(ENVIRONMENT)" && exit 1)
	aws s3 sync $(CLIENT_DIR)/_app/ s3://$(BUCKET)/_app/ --delete
	aws s3 sync $(CLIENT_DIR)/ s3://$(BUCKET)/ --exclude "_app/*"

# Lambda update targets
update-web-app:
	$(eval WEB_APP_LAMBDA_NAME := $(call get_terraform_output,$(ENVIRONMENT),web_app_lambda_function_name))
	$(eval WEB_APP_ECR_URL := $(call get_terraform_output,$(ENVIRONMENT),web_app_ecr_repository_url))
	@test -n "$(WEB_APP_LAMBDA_NAME)" || (echo "❌ Web app Lambda name not found for $(ENVIRONMENT)" && exit 1)
	@test -n "$(WEB_APP_ECR_URL)" || (echo "❌ Web app ECR URL not found for $(ENVIRONMENT)" && exit 1)
	aws lambda update-function-code \
		--function-name $(WEB_APP_LAMBDA_NAME) \
		--image-uri $(WEB_APP_ECR_URL):latest \
		--region $(AWS_REGION)

update-image-processor:
	$(eval IMAGE_PROCESSOR_LAMBDA_NAME := $(call get_terraform_output,$(ENVIRONMENT),lambda_function_name))
	$(eval IMAGE_PROCESSOR_ECR_URL := $(call get_terraform_output,$(ENVIRONMENT),ecr_repository_url))
	@test -n "$(IMAGE_PROCESSOR_LAMBDA_NAME)" || (echo "❌ Image processor Lambda name not found for $(ENVIRONMENT)" && exit 1)
	@test -n "$(IMAGE_PROCESSOR_ECR_URL)" || (echo "❌ Image processor ECR URL not found for $(ENVIRONMENT)" && exit 1)
	aws lambda update-function-code \
		--function-name $(IMAGE_PROCESSOR_LAMBDA_NAME) \
		--image-uri $(IMAGE_PROCESSOR_ECR_URL):latest \
		--region $(AWS_REGION)

# Deployment target
deploy: build-image push-web-app push-image-processor sync-client update-web-app update-image-processor

# Admin user management targets
create-admin-user:
	@if [ -z "$(ADMIN_EMAIL)" ]; then \
		echo "Error: ADMIN_EMAIL environment variable is required"; \
		exit 1; \
	fi
	@if [ -z "$(ADMIN_PASSWORD)" ]; then \
		echo "Error: ADMIN_PASSWORD environment variable is required"; \
		exit 1; \
	fi
	$(eval COGNITO_USER_POOL_ID := $(call get_terraform_output,$(ENVIRONMENT),cognito_user_pool_id))
	@test -n "$(COGNITO_USER_POOL_ID)" || (echo "❌ Cognito user pool ID not found for $(ENVIRONMENT)" && exit 1)
	@if aws cognito-idp admin-get-user --user-pool-id $(COGNITO_USER_POOL_ID) --username $(ADMIN_EMAIL) --region $(AWS_REGION) >/dev/null 2>&1; then \
		echo "Admin user $(ADMIN_EMAIL) already exists in $(ENVIRONMENT) user pool"; \
	else \
		echo "Creating admin user $(ADMIN_EMAIL) in $(ENVIRONMENT) user pool..."; \
		aws cognito-idp admin-create-user \
			--user-pool-id $(COGNITO_USER_POOL_ID) \
			--username $(ADMIN_EMAIL) \
			--user-attributes Name=email,Value=$(ADMIN_EMAIL) Name=email_verified,Value=true \
			--message-action SUPPRESS \
			--region $(AWS_REGION) && \
		aws cognito-idp admin-set-user-password \
			--user-pool-id $(COGNITO_USER_POOL_ID) \
			--username $(ADMIN_EMAIL) \
			--password $(ADMIN_PASSWORD) \
			--permanent \
			--region $(AWS_REGION) && \
		echo "Admin user $(ADMIN_EMAIL) created successfully in $(ENVIRONMENT)!"; \
	fi

delete-admin-user:
	@if [ -z "$(ADMIN_EMAIL)" ]; then \
		echo "Error: ADMIN_EMAIL environment variable is required"; \
		exit 1; \
	fi
	$(eval COGNITO_USER_POOL_ID := $(call get_terraform_output,$(ENVIRONMENT),cognito_user_pool_id))
	@test -n "$(COGNITO_USER_POOL_ID)" || (echo "❌ Cognito user pool ID not found for $(ENVIRONMENT)" && exit 1)
	aws cognito-idp admin-delete-user \
		--user-pool-id $(COGNITO_USER_POOL_ID) \
		--username $(ADMIN_EMAIL) \
		--region $(AWS_REGION)

# Legacy upload-client target (kept for compatibility)
upload-client: sync-client

# Cleanup
clean:
	rm -rf $(CLIENT_DIR)
	docker image rm $(BUILDER_IMAGE) $(IMAGE_NAME) 2>/dev/null || true

# Convenience targets
all: format check test build-image

dev-check: format check

ci: check test build-image