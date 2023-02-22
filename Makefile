stage = $(shell cat ./.sst/stage)

dev: install-deps start-sst

start-sst:
	npm run dev

install-deps:
	npm install
	( \
		python3 -m venv venv; \
		. venv/bin/activate; \
		pip install -r packages/ref-data-retrievers/txc-retriever/requirements.txt --target packages/ref-data-retrievers/txc-retriever/; \
		pip install -r packages/ref-data-uploaders/txc-uploader/requirements.txt --target packages/ref-data-uploaders/txc-uploader/; \
		rm -rf venv; \
	)
	

trigger-naptan-retriever:
	aws lambda invoke --function-name ref-data-service-naptan-retriever-$(stage) --invocation-type Event /tmp/outfile.txt

trigger-noc-retriever:
	aws lambda invoke --function-name ref-data-service-noc-retriever-$(stage) --invocation-type Event /tmp/outfile.txt

trigger-bods-retriever:
	aws lambda invoke --function-name ref-data-service-bods-retriever-$(stage) --invocation-type Event /tmp/outfile.txt

trigger-tnds-retriever:
	aws lambda invoke --function-name ref-data-service-tnds-retriever-$(stage) --invocation-type Event /tmp/outfile.txt