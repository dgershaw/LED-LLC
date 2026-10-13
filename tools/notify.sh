#!/usr/bin/env bash
# Tell the team in Microsoft Teams: posts an Adaptive Card to the TEAMS_WEBHOOK secret (a Teams "Workflows" incoming
# webhook, or a Slack one, which gets plain text). Silent when the secret is not set, so every workflow can call it.
#   tools/notify.sh "<title>" "<text>" "<link url>" "<link label>"
set -euo pipefail
[ -n "${TEAMS_WEBHOOK:-}" ] || { echo "No TEAMS_WEBHOOK secret; nobody to tell."; exit 0; }
TITLE=$1; TEXT=$2; URL=${3:-}; LABEL=${4:-Open}
if [[ "$TEAMS_WEBHOOK" == *slack.com* ]]; then
  BODY=$(jq -cn --arg t "*$TITLE*"$'\n'"$TEXT"$'\n'"$URL" '{text: $t}')
else
  BODY=$(jq -cn --arg title "$TITLE" --arg text "$TEXT" --arg url "$URL" --arg label "$LABEL" '{
    type: "message",
    attachments: [{ contentType: "application/vnd.microsoft.card.adaptive", content: {
      "$schema": "http://adaptivecards.io/schemas/adaptive-card.json", type: "AdaptiveCard", version: "1.4",
      body: [ { type: "TextBlock", text: $title, weight: "Bolder", size: "Medium", wrap: true },
              { type: "TextBlock", text: $text, wrap: true } ],
      actions: (if $url == "" then [] else [{ type: "Action.OpenUrl", title: $label, url: $url }] end) } }] }')
fi
curl -sS -X POST -H 'Content-Type: application/json' -d "$BODY" "$TEAMS_WEBHOOK" -o /dev/null -w 'Teams answered %{http_code}\n' || echo "Teams could not be reached; the publish is unaffected."
