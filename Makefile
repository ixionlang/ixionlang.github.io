.PHONY: build preview
build:
	elm make src/Main.elm --optimize --output=main.js
preview:
	python3 -m http.server 4173 --bind 127.0.0.1
