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
            [ href "https://github.com/ixionlang"
            , class "link"
            , target "_blank"
            ]
            [ githubIcon
            , text "GitHub"
            ]
        , a
            [ href "https://t.me/ixionlang"
            , class "link"
            , target "_blank"
            ]
            [ telegramIcon
            , text "Telegram"
            ]
        ]


githubIcon : Html Msg
githubIcon =
    Html.node "svg"
        [ Html.Attributes.attribute "viewBox" "0 0 24 24"
        , Html.Attributes.attribute "fill" "currentColor"
        ]
        [ Html.node "path"
            [ Html.Attributes.attribute "d" "M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
            ]
            []
        ]


telegramIcon : Html Msg
telegramIcon =
    Html.node "svg"
        [ Html.Attributes.attribute "viewBox" "0 0 24 24"
        , Html.Attributes.attribute "fill" "currentColor"
        ]
        [ Html.node "path"
            [ Html.Attributes.attribute "d" "M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.14.141-.259.259-.374.261l.213-3.053 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.136-.954l11.566-4.458c.538-.196 1.006.128.832.941z"
            ]
            []
        ]
