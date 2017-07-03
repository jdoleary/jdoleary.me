# jdoleary.me

A profile page for myself.  Style inspired by keybase.io and Cmder (http://cmder.net/)

# How I set up my droplet:
1. Make droplet
2. [Change domain server and Configure Domain](https://www.digitalocean.com/community/tutorials/how-to-set-up-a-host-name-with-digitalocean)
3. [Setup Nginx for static hosting](https://www.digitalocean.com/community/tutorials/how-to-install-nginx-on-ubuntu-16-04)
- `sudo ufw enable`
- `sudo ufw allow 'Nginx HTTP'`
- `sudo ufw allow 'OpenSSH'` This one is important or else you can't get back in with SSH
-/var/log/nginx/access.log: Every request to your web server is recorded in this log file unless Nginx is configured to do otherwise.
-/var/log/nginx/error.log: Any Nginx errors will be recorded in this log.
4. [Link sites-available to sites-enabled](https://www.digitalocean.com/community/tutorials/how-to-set-up-nginx-server-blocks-virtual-hosts-on-ubuntu-16-04)
5. [Secure server](https://www.digitalocean.com/community/tutorials/initial-server-setup-with-ubuntu-16-04)
6. [Enable HTTPS with Let's Encrypt](https://www.digitalocean.com/community/tutorials/how-to-secure-nginx-with-let-s-encrypt-on-ubuntu-16-04)
7. [Enable HTTP2] (https://www.digitalocean.com/community/tutorials/how-to-set-up-nginx-with-http-2-support-on-ubuntu-16-04)
8. Use https://www.ssllabs.com/ssltest/analyze.html to analyse SSL cert
9. Set up cron job to run `certbot renew` like `15 3 * * * /usr/bin/certbot renew --quiet --renew-hook "/bin/systemctl reload nginx"`
10. Make regular backups of /etc/letsencrypt