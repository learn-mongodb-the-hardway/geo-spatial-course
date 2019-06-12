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

upstream qmplus_java {
    ip_hash;
    server 127.0.0.1:8580;
    server 127.0.0.1:8680;
    keepalive 8;
}

server {
    listen [::]:443 ssl ipv6only=on; # managed by Certbot
    listen 443 ssl; # managed by Certbot
    server_name pubcrawl.live www.pubcrawl.live; # managed by Certbot
    #server_name pubcrawl.live; # managed by Certbot

    ssl on;
    gzip on;

    # ssl_certificate /root/.config/pubcrawl/live/pubcrawl.live/cert.pem;
    # ssl_certificate_key /root/.config/pubcrawl/live/pubcrawl.live/privkey.pem;
    ssl_certificate /etc/letsencrypt/live/pubcrawl.live/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/pubcrawl.live/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot

    #ssl_stapling on;
    #ssl_stapling_verify on;
    #ssl_trusted_certificate /root/.config/pubcrawl/live/pubcrawl.live/fullchain.pem;

    #ssl_session_timeout 5m;

    location / {
            proxy_pass http://rest_node_js;
            proxy_redirect off;
    }
}

server {
    listen 443 ssl;
    server_name qm.pubcrawl.live;
    ssl on;
    gzip on;
    ssl_certificate /etc/letsencrypt/live/pubcrawl.live/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/pubcrawl.live/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot

    auth_basic "Administrator Login";
    auth_basic_user_file /etc/nginx/.htpasswd;

    location / {
            proxy_pass http://qmplus_java;

            # This is necessary to pass the correct IP to be hashed
            real_ip_header X-Real-IP;

            proxy_redirect off;
            proxy_set_header Host $host;
	        proxy_set_header       Authorization "";
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
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
