.PHONY: build docs preview
build: docs
	elm make src/Main.elm --optimize --output=main.js
docs:
	node scripts/build-docs.mjs
preview:
	python3 -m http.server 4173 --bind 127.0.0.1
