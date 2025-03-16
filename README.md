# Baileys API

## Getting Started

### Setup environment variables

```bash
cp .env.example .env
vim .env
```

### Setup credentials on Redis

```bash
bun manage-api-keys create
```

## Development

To start the development server run:

```bash
bun dev
```

You can also run the test webhook server:

```bash
python webhook.py
```

Open http://localhost:3025/swagger to see the API documentation.
