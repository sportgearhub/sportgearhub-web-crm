# Deployment

Production is deployed by GitHub Actions when the `production` branch is updated. The workflow builds `dist`, uploads the release to the target host, and starts Docker Compose under `/opt/sportgearhub-web-provider`.

The Docker image uses `ghcr.io/static-web-server/static-web-server:2`, a scratch-based static server image. It serves only `dist` and uses `/public/index.html` as the SPA fallback page.

Required GitHub variables:

- `DEPLOY_HOST`: target server host or IP
- `DEPLOY_USER`: SSH user on the target server
- `VITE_API_BASE_URL`: public API base URL used at frontend build time

Required GitHub secret:

- `DEPLOY_SSH_KEY`: private SSH key for the deploy user

Optional GitHub variables:

- `DEPLOY_PORT`: SSH port, defaults to `22`
- `APP_DIR`: target app directory, defaults to `/opt/sportgearhub-web-provider`
- `WEB_PROVIDER_HTTP_PORT`: host HTTP port, defaults to `8080`

The deploy user must be able to write to `/opt/sportgearhub-web-provider` and run Docker Compose. The target host must have an external Docker network named `apps-proxy` so Nginx can proxy to the app container.

Create the proxy network once on the target host if it does not exist:

```sh
docker network create apps-proxy
```

The Nginx container must also be attached to this network. If it is already running:

```sh
docker network connect apps-proxy sportgearhub-nginx
docker restart sportgearhub-nginx
```

If Nginx is managed by Compose, add the same external `apps-proxy` network to the Nginx compose file instead.

Manual server deployment is still possible:

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

The Docker service and container name are `sportgearhub-web-provider`.

From Nginx on the same Docker network, proxy to `http://sportgearhub-web-provider:80`.

Set `WEB_PROVIDER_HTTP_PORT` to change the host port. The default is `8080`.
