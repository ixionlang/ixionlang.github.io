port module Main exposing (main)

import Browser
import Html exposing (..)
import Html.Attributes exposing (..)
import Html.Events exposing (onClick)


port copyCode : String -> Cmd msg


port copyResult : (Bool -> msg) -> Sub msg


type Example
    = Matching
    | Records
    | Functions


type alias Model =
    { selected : Example, copied : Maybe Bool }


type Msg
    = Select Example
    | Copy
    | Copied Bool


main : Program () Model Msg
main =
    Browser.element
        { init = \_ -> ( { selected = Matching, copied = Nothing }, Cmd.none )
        , update = update
        , subscriptions = \_ -> copyResult Copied
        , view = view
        }


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        Select example ->
            ( { model | selected = example, copied = Nothing }, Cmd.none )

        Copy ->
            ( model, copyCode (exampleCode model.selected) )

        Copied ok ->
            ( { model | copied = Just ok }, Cmd.none )


repo : String
repo =
    "https://github.com/ixionlang/ixion"


link : String -> String -> Html Msg
link url caption =
    a [ href url ] [ text caption ]


label : String -> Html Msg
label value =
    p [ class "eyebrow" ] [ text value ]


view : Model -> Html Msg
view model =
    div []
        [ a [ href "#main", class "skip-link" ] [ text "К содержимому" ]
        , header [ class "site-header wrap" ]
            [ a [ href "#", class "brand", attribute "aria-label" "Ixion — главная" ] [ img [ src "assets/ixion-logo.png", alt "ixion", width 126, height 42 ] [] ]
            , nav [ attribute "aria-label" "Основная навигация" ]
                [ link "#examples" "Примеры", link (repo ++ "/blob/main/docs/ru.md") "Документация", a [ href repo, class "github-link" ] [ text "GitHub ↗" ] ]
            ]
        , main_ [ id "main" ]
            [ section [ class "hero wrap" ]
                [ div [ class "hero-copy" ]
                    [ label "ЯЗЫК ПРОГРАММИРОВАНИЯ ДЛЯ JVM"
                    , h1 [] [ text "Ixion —", br [] [], span [] [ text "язык для JVM." ] ]
                    , p [ class "hero-description" ] [ text "Статическая типизация, алгебраические типы данных и неизменяемые структуры. Компилируется в байткод JVM и Java-код." ]
                    , div [ class "hero-actions" ] [ a [ href (repo ++ "/blob/main/docs/ru.md"), class "button primary" ] [ text "Документация", span [] [ text "↗" ] ], a [ href "#examples", class "text-link" ] [ text "Посмотреть код ↓" ] ]
                    , p [ class "hero-note" ] [ span [ class "status-dot" ] [], text "Открытый исходный код · В активной разработке" ]
                    ]
                , div [ class "hero-art", attribute "aria-hidden" "true" ]
                    [ div [ class "orbit orbit-one" ] [], div [ class "orbit orbit-two" ] [], img [ src "assets/ixion-planet.png", alt "", width 490, height 490 ] [] ]
                ]
            , div [ class "facts wrap" ] [ span [] [ text "Статическая типизация" ], span [] [ text "Алгебраические типы" ], span [] [ text "Неизменяемые данные" ], span [] [ text "Байткод JVM" ] ]
            , section [ id "examples", class "examples-section wrap" ]
                [ div [ class "section-heading" ] [ div [] [ label "ПРИМЕРЫ", h2 [] [ text "Синтаксис Ixion" ] ], p [] [ text "Типы, структуры и функции." ] ]
                , div [ class "example-layout" ]
                    [ div [ class "example-sidebar" ]
                        [ div [ class "tabs", attribute "role" "tablist", attribute "aria-label" "Примеры синтаксиса" ] (List.map (exampleTab model.selected) [ ( Matching, "01", "Типы и сопоставление" ), ( Records, "02", "Неизменяемые данные" ), ( Functions, "03", "Функции и обобщения" ) ])
                        , div [ class "example-explanation" ] [ h3 [] [ text (exampleTitle model.selected) ], p [] [ text (exampleDescription model.selected) ] ]
                        ]
                    , div [ class "code-window", id "example-panel", attribute "role" "tabpanel", attribute "aria-labelledby" (tabId model.selected) ]
                        [ div [ class "code-toolbar" ] [ span [] [ span [ class "file-dot" ] [], text (exampleFile model.selected) ], button [ class "copy-button", onClick Copy, attribute "aria-label" "Скопировать пример кода" ] [ text "Копировать ⧉" ] ]
                        , pre [ tabindex 0 ] [ code [] (highlight (exampleCode model.selected)) ]
                        , div [ class "code-result" ] [ span [] [ text "РЕЗУЛЬТАТ" ], code [] [ text (exampleOutput model.selected) ] ]
                        , p [ class "copy-status", attribute "role" "status" ]
                            [ text
                                (case model.copied of
                                    Nothing ->
                                        ""

                                    Just True ->
                                        "Код скопирован"

                                    Just False ->
                                        "Не удалось скопировать. Выделите код вручную."
                                )
                            ]
                        ]
                    ]
                ]
            ]
        ]


tabId : Example -> String
tabId example =
    "tab-" ++ exampleFile example


exampleTab : Example -> ( Example, String, String ) -> Html Msg
exampleTab selected ( example, number, title ) =
    button
        [ classList [ ( "example-tab", True ), ( "active", selected == example ) ]
        , id (tabId example)
        , onClick (Select example)
        , attribute "role" "tab"
        , attribute "aria-selected"
            (if selected == example then
                "true"

             else
                "false"
            )
        , attribute "aria-controls" "example-panel"
        ]
        [ span [] [ text number ], text title, span [ class "tab-arrow", attribute "aria-hidden" "true" ] [ text "↗" ] ]


exampleTitle : Example -> String
exampleTitle example =
    case example of
        Matching ->
            "Алгебраические типы данных"

        Records ->
            "Обновление структур"

        Functions ->
            "Обобщённые функции"


exampleDescription : Example -> String
exampleDescription example =
    case example of
        Matching ->
            "enum задаёт варианты данных. case разбирает их и возвращает значение. Компилятор проверяет полноту ветвей."

        Records ->
            "Поля структуры неизменяемы. with создаёт новое значение с изменёнными полями."

        Functions ->
            "Функция map принимает значение и функцию преобразования. Параметры A и B задают типы входа и результата."


exampleFile : Example -> String
exampleFile example =
    case example of
        Matching ->
            "expression.ix"

        Records ->
            "point.ix"

        Functions ->
            "map.ix"


exampleOutput : Example -> String
exampleOutput example =
    case example of
        Matching ->
            "42"

        Records ->
            "11"

        Functions ->
            "42"


exampleCode : Example -> String
exampleCode example =
    case example of
        Matching ->
            "use <std>\n\ntype Expr = enum {\n    Number(value: int),\n    Add(left: Expr, right: Expr),\n}\n\ndef eval(expr: Expr): int {\n    return case expr {\n        Expr::Number(n) => n,\n        Expr::Add(a, b) => eval(a) + eval(b),\n    }\n}\n\ndef main() {\n    const expr = Expr::Add(\n        Expr::Number(20), Expr::Number(22)\n    )\n    std::println(eval(expr))\n}"

        Records ->
            "use <std>\n\ntype Point = struct { x: int, y: int }\n\ndef move(point: Point): Point {\n    return point with { x = point.x + 10 }\n}\n\ndef main() {\n    const origin = Point(1, 2)\n    const moved = move(origin)\n\n    // origin.x всё ещё равен 1\n    std::println(moved.x)\n}"

        Functions ->
            "use <std>\n\ndef map[A, B](value: A, f: (A) => B): B {\n    return f(value)\n}\n\ndef main() {\n    const double: (int) => int =\n        lambda (n) { return n * 2 }\n\n    const answer = map(21, double)\n    std::println(answer)\n}"


highlight : String -> List (Html Msg)
highlight source =
    source |> String.lines |> List.indexedMap (\index line -> span [ class "code-line" ] [ span [ class "line-number", attribute "aria-hidden" "true" ] [ text (String.fromInt (index + 1)) ], span [] (highlightTokens (String.toList line)) ])


highlightTokens : List Char -> List (Html Msg)
highlightTokens chars =
    case chars of
        [] ->
            []

        '/' :: '/' :: rest ->
            [ span [ class "syntax-comment" ] [ text (String.fromList ('/' :: '/' :: rest)) ] ]

        '"' :: rest ->
            let
                ( content, remaining ) =
                    takeString rest
            in
            span [ class "syntax-string" ] [ text ("\"" ++ String.fromList content) ] :: highlightTokens remaining

        first :: rest ->
            if Char.isAlpha first || first == '_' then
                let
                    ( wordChars, remaining ) =
                        takeWhile (\c -> Char.isAlphaNum c || c == '_') rest

                    word =
                        String.fromList (first :: wordChars)

                    kind =
                        if List.member word [ "use", "type", "enum", "struct", "def", "return", "case", "const", "var", "with", "lambda", "if" ] then
                            "syntax-keyword"

                        else if Char.isUpper first || List.member word [ "int", "string", "float" ] then
                            "syntax-type"

                        else
                            "syntax-name"
                in
                span [ class kind ] [ text word ] :: highlightTokens remaining

            else
                text (String.fromChar first) :: highlightTokens rest


takeWhile : (Char -> Bool) -> List Char -> ( List Char, List Char )
takeWhile predicate chars =
    case chars of
        first :: rest ->
            if predicate first then
                let
                    ( matched, remaining ) =
                        takeWhile predicate rest
                in
                ( first :: matched, remaining )

            else
                ( [], chars )

        [] ->
            ( [], [] )


takeString : List Char -> ( List Char, List Char )
takeString chars =
    case chars of
        [] ->
            ( [], [] )

        '"' :: rest ->
            ( [ '"' ], rest )

        first :: rest ->
            let
                ( content, remaining ) =
                    takeString rest
            in
            ( first :: content, remaining )
