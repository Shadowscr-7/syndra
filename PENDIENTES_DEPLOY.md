# Pendientes antes del Deploy

## Variables OAuth en `.env` (CRÍTICO)

Cada plataforma social necesita un par de credenciales de **tu app registrada** en su developer console.
Sin estas variables, el flujo OAuth falla silenciosamente con "no configurado".

> Los tokens del **usuario** se obtienen después del OAuth y se guardan cifrados en la DB automáticamente.

| Variable | Portal de registro | Ya configurado? |
|---|---|---|
| `META_APP_ID` | https://developers.facebook.com/apps | ✅ |
| `META_APP_SECRET` | https://developers.facebook.com/apps | ✅ |
| `NEXT_PUBLIC_URL` | (URL base de tu app) | ✅ |
| `TWITTER_CLIENT_ID` | https://developer.twitter.com/en/portal/dashboard | ❌ |
| `TWITTER_CLIENT_SECRET` | https://developer.twitter.com/en/portal/dashboard | ❌ |
| `LINKEDIN_CLIENT_ID` | https://www.linkedin.com/developers/apps | ❌ |
| `LINKEDIN_CLIENT_SECRET` | https://www.linkedin.com/developers/apps | ❌ |
| `TIKTOK_CLIENT_KEY` | https://developers.tiktok.com/apps | ❌ |
| `TIKTOK_CLIENT_SECRET` | https://developers.tiktok.com/apps | ❌ |
| `GOOGLE_CLIENT_ID` | https://console.cloud.google.com/apis/credentials | ❌ |
| `GOOGLE_CLIENT_SECRET` | https://console.cloud.google.com/apis/credentials | ❌ |
| `PINTEREST_APP_ID` | https://developers.pinterest.com/apps | ❌ |
| `PINTEREST_APP_SECRET` | https://developers.pinterest.com/apps | ❌ |
| `MERCADOLIBRE_APP_ID` | https://developers.mercadolibre.com.ar/devcenter | ❌ |
| `MERCADOLIBRE_APP_SECRET` | https://developers.mercadolibre.com.ar/devcenter | ❌ |
| `GOOGLE_ADS_DEVELOPER_TOKEN` | https://developers.google.com/google-ads/api/docs/get-started/dev-token | ❌ |

### Notas

- **WhatsApp** no necesita variables en `.env` — el usuario ingresa su URL de Evolution API directamente en la UI.
- **Google** unifica YouTube + Google Ads con un solo par `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.
- **Meta** unifica Instagram + Facebook + Threads + Meta Ads con `META_APP_ID` / `META_APP_SECRET`.
- Cada redirect URI debe registrarse en el portal correspondiente como: `{NEXT_PUBLIC_URL}/api/auth/{provider}/callback`

### Ejemplo para `.env`

```env
# ── OAuth App Credentials ──────────────────────────────────

# Twitter / X
TWITTER_CLIENT_ID=
TWITTER_CLIENT_SECRET=

# LinkedIn
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=

# TikTok
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=

# Google (YouTube + Google Ads)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Pinterest
PINTEREST_APP_ID=
PINTEREST_APP_SECRET=

# Mercado Libre
MERCADOLIBRE_APP_ID=
MERCADOLIBRE_APP_SECRET=

# Google Ads (developer token separado)
GOOGLE_ADS_DEVELOPER_TOKEN=
```
