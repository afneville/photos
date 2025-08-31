BUCKET_NAME := $(shell cd ../infra/environments/test && terraform output -raw staging_bucket_name)
TEST_IMAGE := $(shell ls ../scripts/test_images/ | head -1)
VENV := image_processor/venv
PYTHON := $(VENV)/bin/python
PIP := $(VENV)/bin/pip

.PHONY: help venv install build test-local generate-events clean

help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

build: ## Build SAM application using Docker
	sam build --use-container

generate-events:
	mkdir -p events
	sam local generate-event s3 put --bucket $(BUCKET_NAME) --key $(TEST_IMAGE) > events/s3-put-event.json

test-lambda: build events/s3-put-event.json
	sam local invoke ImageProcessorFunction -e events/s3-put-event.json

clean:
	rm -rf .aws-sam/
	rm -rf events/
	rm -rf $(VENV)/
