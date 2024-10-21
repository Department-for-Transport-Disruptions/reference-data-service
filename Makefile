stage = $(shell cat ./.sst/stage)

dev: install-deps wait-for-db start-sst

wait-for-db:
	./scripts/wait_for_db.sh

start-sst:
	pnpm run dev

install-deps:
	pnpm install
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

cleardown-nptg-tables:
	./scripts/cleardown_nptg.sh

trigger-naptan-retriever:
	aws lambda invoke --function-name ref-data-service-naptan-retriever-$(stage) --invocation-type Event /tmp/outfile.txt > /dev/null

trigger-noc-retriever:
	aws lambda invoke --function-name ref-data-service-noc-retriever-$(stage) --invocation-type Event /tmp/outfile.txt > /dev/null

trigger-nptg-retriever:
	aws lambda invoke --function-name ref-data-service-nptg-retriever-$(stage) --invocation-type Event /tmp/outfile.txt > /dev/null

trigger-bods-retriever:
	aws lambda invoke --function-name ref-data-service-bods-retriever-$(stage) --invocation-type Event /tmp/outfile.txt > /dev/null

trigger-table-renamer:
	aws lambda invoke --function-name ref-data-service-table-renamer-$(stage) --invocation-type Event /tmp/outfile.txt > /dev/null

trigger-all-csv-retrievers: trigger-noc-retriever trigger-naptan-retriever

test-bods-uploader: cleardown-txc-tables upload-bods-file

test-tnds-uploader: cleardown-txc-tables upload-tnds-file

test-nptg-uploader: cleardown-nptg-tables upload-nptg-file

upload-bods-file:
	aws s3 rm s3://ref-data-service-txc-data-$(stage)/bods/test.xml
	aws s3 sync ./test-data/bods s3://ref-data-service-txc-data-$(stage)/bods

upload-tnds-file:
	aws s3 rm s3://ref-data-service-txc-data-$(stage)/tnds/test.xml
	aws s3 sync ./test-data/tnds s3://ref-data-service-txc-data-$(stage)/tnds

upload-nptg-file:
	aws s3 rm s3://ref-data-service-nptg-data-$(stage)/nptg.xml
	aws s3 cp ./test-data/nptg.xml s3://ref-data-service-nptg-data-$(stage)

publish-street-manager-data-to-dev:
	aws sns publish --topic-arn arn:aws:sns:eu-west-2:$(shell aws sts get-caller-identity | jq -r .Account):street-manager-test-topic-$(stage) --message file://test-data/street-manager.json

publish-street-manager-data-to-test:
	aws sns publish --topic-arn arn:aws:sns:eu-west-2:$(shell aws sts get-caller-identity | jq -r .Account):street-manager-test-topic-test --message file://test-data/street-manager.json
