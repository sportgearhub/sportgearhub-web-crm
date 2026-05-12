# Deployment

Production is deployed by GitHub Actions when the `production` branch is updated. The workflow builds `dist`, uploads the release to the target host, and starts Docker Compose under `/opt/sportgearhub-web-provider`.

Required GitHub secrets:

- `DEPLOY_HOST`: target server host or IP
- `DEPLOY_USER`: SSH user on the target server
- `DEPLOY_SSH_KEY`: private SSH key for the deploy user
- `VITE_API_BASE_URL`: public API base URL used at frontend build time

Optional GitHub secrets:

- `DEPLOY_PORT`: SSH port, defaults to `22`
- `WEB_PROVIDER_HTTP_PORT`: host HTTP port, defaults to `8080`

The deploy user must be able to write to `/opt/sportgearhub-web-provider` and run Docker Compose.

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

The Docker service and container name are `sportgearhbu-web-provider`.

Set `WEB_PROVIDER_HTTP_PORT` to change the host port. The default is `8080`.
