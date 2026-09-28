# Deploying 5 Estimathon instances (Ubuntu + Caddy + PM2)

This setup runs 5 independent instances of the server, managed by PM2
(a Node.js process manager — far lighter on disk than Docker), each with
its own data directory, behind a separate domain with its own basic-auth
credentials in Caddy.

## 1. One-time server setup

Works on Ubuntu 18.04 with Node 16 (PM2 5.x supports it fine).

Do NOT use the distro's `nodejs` package on 18.04 (it's Node 8.x). Use the
NodeSource repo for Node 16:

```bash
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt install -y nodejs
node -v            # should print v16.x
sudo npm install -g pm2
# if the latest pm2 ever complains about Node 16:
#   sudo npm install -g pm2@5
```

(Or use nvm if you prefer a per-user, no-sudo install.)

## 2. Deploy the app

```bash
# from the repo root on the server
npm install
mkdir -p dist/logs

# start all 5 instances (ports 3001-3005, data in dist/instance-N)
pm2 start ecosystem.config.js

pm2 save
pm2 startup    # follow the printed instruction to enable start-on-boot
```

Useful commands:

```bash
pm2 status              # see all 5 running
pm2 logs estimathon-1   # tail one instance
pm2 restart all
pm2 delete all          # stop everything
```

## 3. Configure Caddy

Copy `Caddyfile` to the server (e.g. `/etc/caddy/Caddyfile` if that's your
Caddy config location, or wherever `caddy` is run from). Edit it:

- Replace `example1.com` ... `example5.com` with your real domains.
- For each site generate a password hash ON THE SERVER:

  ```bash
  caddy hash-password --plaintext 'PASSWORD_FOR_SITE_1'
  ```

  and paste the resulting bcrypt hash into the corresponding
  `basic_auth` block. You can also change the usernames.

Then reload:

```bash
sudo systemctl reload caddy
# or, if running Caddy manually:
caddy run --config Caddyfile
```

Caddy will automatically obtain/renew HTTPS certificates for all 5 domains
(the domains must point at the server's IP).

## Notes

- Each instance keeps its data in `dist/instance-N/log.json` (with timestamped
  backups alongside). Teams/answers for each instance are configured via the
  scoreboard editor (POST /metadata) after logging in.
- The Node servers bind to 127.0.0.1 only, so they are not reachable
  directly from the network — only through Caddy (and thus only with auth).
- Basic auth also protects `/log` and `/metadata`, so the answers cannot be
  fetched without credentials.
