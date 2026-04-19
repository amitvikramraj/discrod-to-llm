# Discord to LLM

> Similar to [slack-to-llm](https://github.com/amitvikramraj/slack-to-llm) but for Discord.


Export Discord messages into **TOON** format — a flat, tabular text format designed to be fed directly into an LLM as project context.

## Prerequisites

- [uv](https://docs.astral.sh/uv/)
- [Docker](https://www.docker.com/) (for DiscordChatExporter)
- A Discord token (user or bot) — see [docs/discord-exporter.md](docs/discord-exporter.md)

## Quickstart

```bash
# Install Python dependencies
uv sync

# Copy and edit the channel config
cp channels.example.yaml channels.yaml
# Edit channels.yaml with your guild ID and channel IDs

# Add your Discord token
echo 'TOKEN=your-token-here' > .env
```

### Get channel IDs

1. In Discord, go to **Settings > Advanced > Enable Developer Mode**
2. Right-click a channel and click **Copy Channel ID**
3. Add it to `channels.yaml`

### Export and convert

```bash
# Export Discord channels to JSON + convert to TOON
./run sync

# Or run each step separately:
./run export_discord          # fetch JSON via Docker (default: after 2025-05-31)
./run export_discord 2025-01-01  # custom start date
./run convert                 # convert JSON exports to TOON
```

Output lands in `toon/` — one `.toon` file per channel, ready to drop into a Claude project.

## TOON format

Each file is a tabular list of messages with Discord permalinks:

```
channel: #general
messages[42]{id,timestamp,user,text,permalink,reference_id}:
  "100001","2025-06-03T14:22:00","alice","shipped the new auth flow","https://discord.com/channels/guild/chan/100001",null
  "100002","2025-06-03T14:25:12","bob","nice, does it handle the edge case?","https://discord.com/channels/guild/chan/100002","100001"
```

Every message includes a Discord permalink so the LLM can cite sources. Replies link back via `reference_id`.

## Generating reports

Feed the `toon/*.toon` files to Claude as project context, ask it to generate an HTML report, then convert to PDF:

```bash
# Convert HTML report to multi-page PDF (dark theme, dynamic page sizes)
./run pdf pdf-export/reports/my-report.html
```

See [HTML-TO-PDF.md](HTML-TO-PDF.md) for details on customizing the PDF section layout.

## All commands

```
./run help
  export_discord [AFTER_DATE]       Export Discord channels to JSON via Docker
  convert                           Convert JSON exports to TOON format
  sync                              Run export + convert
  pdf <input.html> [out.pdf]        Convert HTML report to PDF
```
