#!/bin/bash

set -o errexit
set -o nounset
set -o pipefail
set -o xtrace

if [[ -z "${APPSMITH_DISABLE_IFRAME_WIDGET_SANDBOX-}" ]]; then
  # For backwards compatibility, if this is not set to anything, we default to no sandbox for iframe widgets.
  export APPSMITH_DISABLE_IFRAME_WIDGET_SANDBOX="true"
fi

apply-env-vars() {
  original="$1"
  served="$2"
  node -e '
  const fs = require("fs")
  const content = fs.readFileSync("'"$original"'", "utf8").replace(
    /\b__(APPSMITH_[A-Z0-9_]+)__\b/g,
    (placeholder, name) => (process.env[name] || "")
  )
  fs.writeFileSync("'"$served"'", content)
  '
  pushd "$(dirname "$served")"
  gzip --keep --force "$(basename "$served")"
  popd
}

apply-env-vars /opt/appsmith/editor/index.html "$NGINX_WWW_PATH/index.html"

# todo: use caddy storage export and import as part of backup/restore.

node caddy-reconfigure.mjs

if pgrep caddy >/dev/null; then
  # Caddy may already be running for the loading page.
  /opt/caddy/caddy stop
fi

exec /opt/caddy/caddy run --config "$TMP/Caddyfile"
