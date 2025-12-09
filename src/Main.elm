module Main exposing (main)

import Browser
import Html exposing (Html, a, br, code, div, h1, img, p, span, text)
import Html.Attributes exposing (alt, class, href, src, target)


main : Program () Model Msg
main =
    Browser.sandbox
        { init = init
        , update = update
        , view = view
        }


type alias Model =
    {}


type Msg
    = NoOp


init : Model
init =
    {}


update : Msg -> Model -> Model
update msg model =
    case msg of
        NoOp ->
            model


view : Model -> Html Msg
view model =
    div [ class "container" ]
        [ viewLogo
        , viewCodeBlock
        , viewLinks
        ]


viewLogo : Html Msg
viewLogo =
    div [ class "logo" ]
        [ div [ class "logo-main" ]
            [ img
                [ src "https://raw.githubusercontent.com/ixionlang/ixion/main/assets/icon.png"
                , alt "Ixion Logo"
                , class "logo-icon"
                ]
                []
            , h1 [ class "logo-text" ] [ text "Ixion" ]
            ]
        , p [ class "tagline" ] [ text "functional programming language for the JVM platform" ]
        ]


viewCodeBlock : Html Msg
viewCodeBlock =
    div [ class "code-block" ]
        [ code []
            [ span [ class "keyword" ] [ text "use" ]
            , text " <prelude>"
            , br [] []
            , br [] []
            , span [ class "keyword" ] [ text "type" ]
            , text " "
            , span [ class "type" ] [ text "number" ]
            , text " = "
            , span [ class "type" ] [ text "int" ]
            , text " | "
            , span [ class "type" ] [ text "float" ]
            , br [] []
            , br [] []
            , span [ class "keyword" ] [ text "pub" ]
            , text " "
            , span [ class "keyword" ] [ text "def" ]
            , text " "
            , span [ class "function" ] [ text "main" ]
            , text "(){"
            , br [] []
            , text "    "
            , span [ class "function" ] [ text "print_type" ]
            , text "("
            , span [ class "variable" ] [ text "10" ]
            , text ")"
            , br [] []
            , text "    "
            , span [ class "function" ] [ text "print_type" ]
            , text "("
            , span [ class "variable" ] [ text "10.0f" ]
            , text ")"
            , br [] []
            , text "}"
            , br [] []
            , br [] []
            , span [ class "keyword" ] [ text "def" ]
            , text " "
            , span [ class "function" ] [ text "print_type" ]
            , text "("
            , span [ class "variable" ] [ text "num" ]
            , text " : "
            , span [ class "type" ] [ text "number" ]
            , text "){"
            , br [] []
            , text "    "
            , span [ class "keyword" ] [ text "case" ]
            , text " "
            , span [ class "variable" ] [ text "num" ]
            , text " {"
            , br [] []
            , text "        "
            , span [ class "type" ] [ text "int" ]
            , text " "
            , span [ class "variable" ] [ text "i" ]
            , text " => "
            , span [ class "function" ] [ text "println" ]
            , text "("
            , span [ class "string" ] [ text "\"value \"" ]
            , text " + "
            , span [ class "variable" ] [ text "i" ]
            , text " + "
            , span [ class "string" ] [ text "\" is integer\"" ]
            , text ")"
            , br [] []
            , text "        "
            , span [ class "type" ] [ text "float" ]
            , text " "
            , span [ class "variable" ] [ text "f" ]
            , text " => "
            , span [ class "function" ] [ text "println" ]
            , text "("
            , span [ class "string" ] [ text "\"value \"" ]
            , text " + "
            , span [ class "variable" ] [ text "f" ]
            , text " + "
            , span [ class "string" ] [ text "\" is float\"" ]
            , text ")"
            , br [] []
            , text "    }"
            , br [] []
            , text "}"
            ]
        ]


viewLinks : Html Msg
viewLinks =
    div [ class "links" ]
        [ a
            [ href "https://github.com/ixionlang/ixion"
            , class "link"
            , target "_blank"
            ]
            [ text "GitHub" ]
        , a
            [ href "https://github.com/ixionlang/ixion/tree/main/docs/ru.md"
            , class "link"
            , target "_blank"
            ]
            [ text "Документация" ]
        , a
            [ href "https://t.me/ixionlang"
            , class "link"
            , target "_blank"
            ]
            [ text "Telegram" ]
        ]
        