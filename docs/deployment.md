# Deployment

Build the production assets and Docker image on the target host under `/opt/sportgearhub-web-provider`.

```sh
cd /opt/sportgearhub-web-provider
git fetch origin
git checkout production
git pull --ff-only origin production
npm ci
npm run build
docker compose -f deploy/docker-compose.yml up -d --build
```

If the host uses legacy Compose, run `docker-compose -f deploy/docker-compose.yml up -d --build` instead.

The Docker service and container name are `sportgearhbu-web-provider`.

Set `WEB_PROVIDER_HTTP_PORT` to change the host port. The default is `8080`.
