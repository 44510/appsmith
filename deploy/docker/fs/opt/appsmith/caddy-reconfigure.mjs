import * as fs from "fs"
import {dirname} from "path"
import {spawnSync} from "child_process"

const APPSMITH_CUSTOM_DOMAIN = process.env.APPSMITH_CUSTOM_DOMAIN ?? null
const CaddyfilePath = process.env.TMP + "/Caddyfile"

const parts = []

parts.push(`
{
  admin 127.0.0.1:2019
  persist_config off
  acme_ca_root /etc/ssl/certs/ca-certificates.crt
  servers {
    trusted_proxies static 0.0.0.0/0
  }
}

(file_server) {
  file_server {
    precompressed br gzip
    disable_canonical_uris
  }
}

(reverse_proxy) {
  reverse_proxy {
    to 127.0.0.1:{args[0]}
    header_up -Forwarded
  }
}

(all-config) {
  log {
    output stdout
  }
  skip_log /api/v1/health

  header {
    -Server
    Content-Security-Policy "frame-ancestors ${process.env.APPSMITH_ALLOWED_FRAME_ANCESTORS ?? "'self' *"}"
    X-Content-Type-Options "nosniff"
  }

  request_body {
    max_size 150MB
  }

  handle {
    root * {$NGINX_WWW_PATH}
    try_files /loading.html /index.html
    import file_server
  }

  root * /opt/appsmith/editor
  @file file
  handle @file {
    import file_server
    skip_log
  }
  error /static/* 404

  handle /info {
    root * /opt/appsmith
    rewrite * /info.json
    import file_server
  }

  @backend path /api/* /oauth2/* /login/*
  handle @backend {
    import reverse_proxy 8080
  }

  handle /rts/* {
    import reverse_proxy 8091
  }

  redir /supervisor /supervisor/
  handle_path /supervisor/* {
    import reverse_proxy 9001
  }

  handle_errors {
    respond "{err.status_code} {err.status_text}" {err.status_code}
  }
}
`)
// todo: use 404.html for the 404 error

if (APPSMITH_CUSTOM_DOMAIN != null) {
  let certLocation = null
  try {
    fs.accessSync("/appsmith-stacks/ssl/fullchain.pem", fs.constants.R_OK)
    certLocation = "/appsmith-stacks/ssl"
  } catch (_) {
    // no custom certs, see if old certbot certs are there.
    try {
      fs.accessSync(`/etc/letsencrypt/live/${APPSMITH_CUSTOM_DOMAIN}/fullchain.pem`, fs.constants.R_OK)
      certLocation = "/etc/letsencrypt/live" + APPSMITH_CUSTOM_DOMAIN
    } catch (_) {
      // no certs there either, ignore.
    }
  }

  const tlsConfig = certLocation == null ? "" : `tls ${certLocation}/fullchain.pem ${certLocation}/privkey.pem`

  parts.push(`
  localhost:80 127.0.0.1:80 {
    import all-config
  }
  ${APPSMITH_CUSTOM_DOMAIN} {
    import all-config
    ${tlsConfig}
  }
  `)

} else {
  parts.push(`
  :80 {
    import all-config
  }
  `)

}

fs.mkdirSync(dirname(CaddyfilePath), { recursive: true })
fs.writeFileSync(CaddyfilePath, parts.join("\n"))
spawnSync("/opt/caddy/caddy", ["fmt", "--overwrite", CaddyfilePath])
spawnSync("/opt/caddy/caddy", ["reload", "--config", CaddyfilePath])
