# Nginx Proxy Setup - Multiple Apps on One Server

## Question: Can I run multiple apps with nginx proxy on one server?

**Answer: YES!** Having nginx in your docker-compose does NOT limit you to one app per server. Here are several approaches:

## Approach 1: Multiple Docker Compose Stacks (Recommended)

You can run multiple applications on the same server, each with their own docker-compose setup:

```
/var/www/
├── toshacity/
│   ├── docker-compose.prod.yml
│   └── proxy/nginx.prod.conf (handles apis.toshacity.co.ke & admin.toshacity.co.ke)
│
├── another-app/
│   ├── docker-compose.prod.yml
│   └── proxy/nginx.prod.conf (handles app2.example.com)
│
└── third-app/
    ├── docker-compose.prod.yml
    └── proxy/nginx.prod.conf (handles app3.example.com)
```

**How it works:**
- Each app runs on different internal ports (3000, 3001, etc.)
- Each app's nginx listens on ports 80/443 but routes based on `server_name`
- Docker's internal networking isolates each stack
- External nginx (or cloudflare/load balancer) routes traffic based on domain

## Approach 2: Single Nginx Proxy (Reverse Proxy Pattern)

Run one nginx container that routes to multiple apps:

```nginx
# Main nginx config (runs on host or separate container)
upstream toshacity_backend {
    server localhost:3000;
}

upstream toshacity_frontend {
    server localhost:3001;
}

upstream other_app_backend {
    server localhost:4000;
}

server {
    listen 80;
    server_name apis.toshacity.co.ke;
    location / {
        proxy_pass http://toshacity_backend;
    }
}

server {
    listen 80;
    server_name admin.toshacity.co.ke;
    location / {
        proxy_pass http://toshacity_frontend;
    }
}

server {
    listen 80;
    server_name app2.example.com;
    location / {
        proxy_pass http://other_app_backend;
    }
}
```

## Approach 3: Host-Level Nginx (Most Common)

Install nginx directly on the host (not in Docker) and route to Docker containers:

```bash
# Install nginx on host
sudo apt install nginx

# Configure nginx to route to Docker containers
sudo nano /etc/nginx/sites-available/toshacity
```

```nginx
# /etc/nginx/sites-available/toshacity
upstream toshacity_backend {
    server 127.0.0.1:3000;
}

upstream toshacity_frontend {
    server 127.0.0.1:3001;
}

server {
    listen 80;
    server_name apis.toshacity.co.ke admin.toshacity.co.ke;
    
    location /api {
        proxy_pass http://toshacity_backend;
    }
    
    location / {
        proxy_pass http://toshacity_frontend;
    }
}
```

Then enable it:
```bash
sudo ln -s /etc/nginx/sites-available/toshacity /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Approach 4: Cloudflare / External Load Balancer

Use Cloudflare or AWS ALB to route traffic:

- Cloudflare DNS → Routes domains to your server IP
- Your server runs multiple docker-compose stacks
- Each app handles its own domain via nginx `server_name`

## Current Setup (ToshaCity)

Your current setup uses **Approach 1** with a twist:

- Each docker-compose stack has its own nginx proxy
- Nginx routes based on `server_name` in the config
- Multiple stacks can run simultaneously on different ports
- External traffic is routed by DNS to your server IP

## Port Management

When running multiple apps:

1. **Internal Docker ports** (container-to-container): Can overlap (all use 3000 internally)
2. **Host ports** (external access): Must be unique
   - ToshaCity: 80, 443 (nginx), 3000 (backend), 3001 (frontend)
   - App 2: 8080, 8443 (nginx), 4000 (backend), 4001 (frontend)
   - App 3: 9080, 9443 (nginx), 5000 (backend), 5001 (frontend)

3. **Nginx routing**: Uses `server_name` to route, not ports

## Example: Running 3 Apps

```yaml
# App 1: ToshaCity (docker-compose.prod.yml)
services:
  proxy:
    ports:
      - "80:80"
      - "443:443"
    # Routes: apis.toshacity.co.ke, admin.toshacity.co.ke

# App 2: Another App (docker-compose.prod.yml)
services:
  proxy:
    ports:
      - "8080:80"
      - "8443:443"
    # Routes: app2.example.com

# App 3: Third App (docker-compose.prod.yml)
services:
  proxy:
    ports:
      - "9080:80"
      - "9443:443"
    # Routes: app3.example.com
```

**Better approach**: Use one nginx on ports 80/443 that routes to all apps internally.

## Recommended Production Setup

For production with multiple apps, use **Approach 3** (Host-level nginx):

1. Install nginx on the host
2. Configure nginx to route based on domain
3. Each app runs in Docker on internal ports
4. Nginx proxies to Docker containers

This gives you:
- ✅ Single SSL certificate management
- ✅ Centralized logging
- ✅ Easier port management
- ✅ Better performance
- ✅ One place to manage all routing

## Summary

**Your question**: "Does having nginx in docker-compose mean only one app can run?"

**Answer**: No! You can:
- Run multiple docker-compose stacks (each with its own nginx)
- Use one nginx to route to multiple apps
- Use host-level nginx to route to Docker containers
- Use external load balancers (Cloudflare, AWS ALB)

The current setup is fine for a single app. If you need multiple apps, consider using host-level nginx or a single nginx container that routes to multiple backend services.

