SHELL := /bin/bash

IMAGE := supplier-evaluation-tool:latest
CSV ?= data/examples/suppliers_min.yaml

build:
	docker build -t $(IMAGE) .

run: build
	docker run --rm -e ECOBALYSE_API_KEY=$${ECOBALYSE_API_KEY} -v $$PWD:/app $(IMAGE) $(CSV)

shell: build
	docker run --rm -it -e ECOBALYSE_API_KEY=$${ECOBALYSE_API_KEY} -v $$PWD:/app --entrypoint /bin/bash $(IMAGE)
