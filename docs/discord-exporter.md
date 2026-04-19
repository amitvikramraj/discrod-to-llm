## How to Export the Last 8 Months of Discord Messages Using DiscordChatExporter

### Step 1 — Get Your Discord Token

You need a token to authenticate. You have two options:

**Option A: User Token** (easiest for personal use)

1. Open [discord.com](https://discord.com) in Chrome/Firefox and log in.
2. Press `Cmd + Option + I` to open DevTools.
3. Go to the **Console** tab.
4. Paste this and press Enter:

```js
let m;webpackChunkdiscord_app.push([[Math.random()],{},e=>{for(let i in e.c){let x=e.c[i];if(x?.exports?.getToken){m=x;break}}}]);m&&console.log("Token:",m.exports.getToken());
```

5. Copy the token that appears.

> **Warning:** Using a user token technically violates Discord's ToS (self-bot policy). Use at your own risk. A bot token is the safer alternative but requires the bot to be invited to the server.

**Option B: Bot Token** (ToS-compliant)

1. Go to [Discord Developer Portal](https://discord.com/developers/applications) and create an application.
2. Go to **Bot** section, click **Reset Token**, and copy it.
3. Enable **Message Content Intent** under **Privileged Gateway Intents**.
4. Invite the bot to your server using this URL (replace `YOUR_APP_ID`):
   ```
   https://discord.com/oauth2/authorize?scope=bot&permissions=66560&client_id=YOUR_APP_ID
   ```

---

### Step 2 — Get Channel IDs

1. In Discord, go to **Settings > Advanced > Enable Developer Mode**.
2. Right-click each channel you want to export and click **Copy Channel ID**.
3. Save these IDs somewhere — you'll need one per export command.

---

### Step 3 — Install DiscordChatExporter (CLI via Docker)

Since you're on macOS, Docker is the simplest approach — no .NET runtime needed.

```bash
docker pull tyrrrz/discordchatexporter
```

If you don't have Docker, you can alternatively [download the CLI zip](https://github.com/Tyrrrz/DiscordChatExporter/releases/latest) (look for `DiscordChatExporter.Cli.*.zip`) — but this requires the .NET 8 runtime.

---

### Step 4 — Export with Date Range (Last 8 Months)

8 months ago from today (March 27, 2026) is approximately **July 27, 2025**. Use the `--after` flag to limit the export.

**Export a single channel (Docker):**

```bash
docker run --rm -v "$(pwd)/exports:/out" tyrrrz/discordchatexporter export \
  -t "YOUR_TOKEN" \
  -c CHANNEL_ID \
  --after "2025-07-27" \
  -f Json \
  -o /out
```

**Export multiple channels** — just pass multiple `-c` flags:

```bash
docker run --rm -v "$(pwd)/exports:/out" tyrrrz/discordchatexporter export \
  -t "YOUR_TOKEN" \
  -c CHANNEL_ID_1 \
  -c CHANNEL_ID_2 \
  -c CHANNEL_ID_3 \
  --after "2025-07-27" \
  -f Json \
  -o /out
```

The exports will appear in the `./exports` directory on your machine.

---

### Step 5 — Choose Your Output Format

Use the `-f` flag to pick a format:

| Format | Flag | Best For |
|---|---|---|
| HTML (dark) | `-f HtmlDark` | Human-readable viewing in a browser |
| HTML (light) | `-f HtmlLight` | Same, with light theme |
| JSON | `-f Json` | Programmatic parsing / feeding to an LLM |
| Plain Text | `-f PlainText` | Simple text, smallest file size |
| CSV | `-f Csv` | Spreadsheet analysis |

Since your project is called `discord-to-llm`, **JSON** is likely the best format — it's structured and easily parsable.

---

### Optional Flags

| Flag | Purpose |
|---|---|
| `--media` | Download attached images/files alongside the export |
| `--reuse-media` | Skip re-downloading assets on subsequent exports |
| `--before "2026-03-27"` | Set an explicit end date |
| `--include-threads all` | Include archived and active threads |
| `-p 20mb` | Split output into 20 MB chunks |
| `--filter "from:username"` | Filter by author, content, etc. |

---

### Quick Summary

```bash
# 1. Pull the Docker image
docker pull tyrrrz/discordchatexporter

# 2. Export last 8 months of a channel as JSON
docker run --rm -v "$(pwd)/exports:/out" tyrrrz/discordchatexporter export \
  -t "YOUR_TOKEN" \
  -c CHANNEL_ID \
  --after "2025-07-27" \
  -f Json \
  -o /out
```

Replace `YOUR_TOKEN` with your Discord token and `CHANNEL_ID` with each channel's ID. Repeat or pass multiple `-c` flags for multiple channels.