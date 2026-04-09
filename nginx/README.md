# Nginx config – Staging (mangoseasonlabs.co.ke)

Single config for the **staging server**: nginx fronts both backend and frontend.

## Hostnames

| Service  | Hostname                                      | Proxies to       |
|----------|-----------------------------------------------|------------------|
| Backend  | `laketown-services.mangoseasonlabs.co.ke`   | `127.0.0.1:4515` |
| Frontend | `laketown-dashboard.mangoseasonlabs.co.ke` | `127.0.0.1:3015` |

## Install on server

1. Copy the config and enable it:

   ```bash
   sudo cp nginx/laketown-staging.conf /etc/nginx/sites-available/
   sudo ln -s /etc/nginx/sites-available/laketown-staging.conf /etc/nginx/sites-enabled/
   ```

2. Test and reload nginx:

   ```bash
   sudo nginx -t && sudo systemctl reload nginx
   ```

3. Get SSL with Certbot (if not already):

   ```bash
   sudo certbot --nginx -d laketown-services.mangoseasonlabs.co.ke -d laketown-dashboard.mangoseasonlabs.co.ke
   ```

   Certbot will add HTTPS server blocks and redirects.

## Staging `.env.production`

On the staging server, set these so the app uses the staging hostnames:

```bash
FRONTEND_URL=https://laketown-dashboard.mangoseasonlabs.co.ke
NEXT_PUBLIC_API_URL=https://laketown-services.mangoseasonlabs.co.ke/api
```

Then (re)build/start the stack so the frontend is built with the correct API URL.
