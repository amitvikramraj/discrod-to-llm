# Discord Export Utils

## Python / UV Conventions

- Never call `python` or `python3` directly — always use `uv run`
- Never use `uv pip install` — only `uv add` and `uv run`
- Test runner: `uv run pytest`

## Project Structure

- `src/discord_export/` — Python package for JSON→TOON conversion
- `run` — main script (export → convert)
- `channels.yaml` — selective channel config (gitignored; copy from channels.example.yaml)
- `exports/` — DiscordChatExporter JSON output (gitignored)
- `toon/` — TOON output for Claude (gitignored)

## Testing

```bash
# Unit tests (fast)
uv run pytest tests/unit/ -v

# All tests
uv run pytest -v
```
