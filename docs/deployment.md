# Deployment

Build the production assets and Docker image on the target host under `/opt/sportgearhub-web-provider`.

```sh
cd /opt/sportgearhub-web-provider
git fetch origin
git checkout production
git pull --ff-only origin production
npm ci
npm run build
docker compose up -d --build
```

If the host uses legacy Compose, run `docker-compose up -d --build` instead.

The Docker service and container name are `sportgearhbu-web-provider`.

Set `WEB_PROVIDER_HTTP_PORT` to change the host port. The default is `8080`.
