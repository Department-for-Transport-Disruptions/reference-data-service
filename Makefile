stage = $(shell cat ./.sst/stage)

dev: install-deps wait-for-db start-sst

wait-for-db:
	./scripts/wait_for_db.sh

start-sst:
	npm run dev

install-deps:
	npm install
	( \
		python3 -m venv venv; \
		. venv/bin/activate; \
		pip install -r packages/ref-data-retrievers/txc-retriever/requirements.txt --target packages/ref-data-retrievers/txc-retriever/; \
		pip install -r packages/ref-data-retrievers/txc-unzipper/requirements.txt --target packages/ref-data-retrievers/txc-unzipper/; \
		pip install -r packages/ref-data-uploaders/txc-uploader/requirements.txt --target packages/ref-data-uploaders/txc-uploader/; \
		rm -rf venv; \
	)

cleardown-txc-tables:
	./scripts/cleardown_txc.sh
	

trigger-naptan-retriever:
	aws lambda invoke --function-name ref-data-service-naptan-retriever-$(stage) --invocation-type Event /tmp/outfile.txt > /dev/null

trigger-noc-retriever:
	aws lambda invoke --function-name ref-data-service-noc-retriever-$(stage) --invocation-type Event /tmp/outfile.txt > /dev/null

trigger-localities-retriever:
	aws lambda invoke --function-name ref-data-service-localities-retriever-$(stage) --invocation-type Event /tmp/outfile.txt > /dev/null

trigger-bods-retriever:
	aws lambda invoke --function-name ref-data-service-bods-retriever-$(stage) --invocation-type Event /tmp/outfile.txt > /dev/null

trigger-all-csv-retrievers: trigger-noc-retriever trigger-localities-retriever trigger-naptan-retriever

test-bods-uploader: cleardown-txc-tables upload-bods-file

test-tnds-uploader: cleardown-txc-tables upload-tnds-file

upload-bods-file:
	aws s3 rm s3://ref-data-service-txc-data-$(stage)/bods/test.xml
	aws s3 sync ./test-data/bods s3://ref-data-service-txc-data-$(stage)/bods

upload-tnds-file:
	aws s3 rm s3://ref-data-service-txc-data-$(stage)/tnds/test.xml
	aws s3 sync ./test-data/tnds s3://ref-data-service-txc-data-$(stage)/tnds
