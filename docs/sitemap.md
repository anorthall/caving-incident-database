# Sitemap and robots.txt

Generate the sitemap with `just dj build_sitemap` (options: `--output`, `--site-url`).
Defaults come from the `SITEMAP_PATH` and `SITE_URL` settings (environment variables of the same name).

Serve the generated file at `/sitemap.xml` and advertise it in `robots.txt`:

```
User-agent: *
Allow: /
Sitemap: https://<your-domain>/sitemap.xml
```

Run the command on a schedule (for example nightly) so new incidents are included.
