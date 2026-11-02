# Ixion website

```sh
make build
make preview
```

`make build` regenerates the static documentation from `docs/` and `spec/`
(`docs/ru.html`, `spec/specification.ru.html`, `spec/specification.en.html`,
`spec/grammar.html` and the `docs/` hub), then compiles the Elm homepage.

To rebuild only the documentation:

```sh
make docs
```
