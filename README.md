# geo-spatial-course
Application, Data and other content related to Geo-Spatial Course


# setting up nginx with certbot

https://certbot.eff.org/lets-encrypt/ubuntubionic-apache.html
https://www.digitalocean.com/community/tutorials/how-to-secure-nginx-with-let-s-encrypt-on-ubuntu-18-04

Create a file under `/etc/nginx/sites-available/` called `pubcrawl.live` and enter the following information.

```
upstream rest_node_js {
    server  127.0.0.1:8080;
}

server {
    listen [::]:443 ssl ipv6only=on; # managed by Certbot
    listen 443 ssl; # managed by Certbot
    server_name pubcrawl.live www.pubcrawl.live; # managed by Certbot

    ssl on;
    gzip on;

    ssl_certificate /etc/letsencrypt/live/pubcrawl.live/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/pubcrawl.live/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot

    location / {
            proxy_pass http://rest_node_js;
            proxy_redirect off;
    }
}
```

Enable the site by

```
ln -s /etc/nginx/sites-available/pubcrawl.live /etc/nginx/sites-enabled/
```

Restart nginx

```
systemctl stop nginx
systemctl start nginx
```

contact us on email
