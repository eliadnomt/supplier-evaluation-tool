SHELL := /bin/bash

IMAGE := supplier-evaluation-tool:latest

build:
	docker build -t $(IMAGE) .

run: build
	docker run --rm -p 8000:5000 \
		-e ECOBALYSE_API_KEY=$${ECOBALYSE_API_KEY} \
		-v $$PWD/data/examples:/app/data/examples \
		-v $$PWD/src/interface/static:/app/src/interface/static \
		$(IMAGE)

shell: build
	docker run --rm -it -e ECOBALYSE_API_KEY=$${ECOBALYSE_API_KEY} -v $$PWD:/app --entrypoint /bin/bash $(IMAGE)
