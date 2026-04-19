"""Convert DiscordChatExporter JSON exports to TOON format with permalinks."""

from __future__ import annotations

import json
import sys
from pathlib import Path

import yaml
from toon_format import encode

from discord_export.permalink import make_permalink

# Discord message types that represent system events, not real user messages.
# See: https://discord.com/developers/docs/resources/channel#message-object-message-types
SKIP_TYPES = {
    "RecipientAdd",
    "RecipientRemove",
    "Call",
    "ChannelNameChange",
    "ChannelIconChange",
    "ChannelPinnedMessage",
    "GuildMemberJoin",
    "GuildBoost",
    "GuildBoostTier1",
    "GuildBoostTier2",
    "GuildBoostTier3",
    "ChannelFollowAdd",
    "GuildDiscoveryDisqualified",
    "GuildDiscoveryRequalified",
    "ThreadCreated",
    "ThreadStarterMessage",
    "GuildInviteReminder",
    "AutoModeration",
}


def resolve_author(author: dict) -> str:
    """Resolve an author dict to a display name. Prefers nickname, falls back to name."""
    return author.get("nickname") or author.get("name") or "unknown"


def transform_channel(
    messages: list[dict],
    channel_name: str,
    channel_id: str,
    guild_id: str,
) -> dict:
    """Transform raw DiscordChatExporter messages into a clean structure for TOON encoding.

    - Resolves authors to display names
    - Constructs permalinks
    - Extracts only relevant fields (id, timestamp, user, text, permalink, reference_id)
    - Sorts chronologically
    - Skips system event types
    """
    transformed = []
    for msg in messages:
        msg_type = msg.get("type", "")
        if msg_type in SKIP_TYPES:
            continue

        msg_id = msg.get("id", "")
        author = msg.get("author", {})
        reference = msg.get("reference")
        reference_id = None
        if reference and msg_type == "Reply":
            reference_id = reference.get("messageId")

        permalink = make_permalink(guild_id, channel_id, msg_id)

        text = msg.get("content", "")
        embeds = msg.get("embeds", [])
        if not text and embeds:
            embed_parts = []
            for embed in embeds:
                for field in embed.get("fields", []):
                    name = field.get("name", "")
                    value = field.get("value", "")
                    if name and value:
                        embed_parts.append(f"{name}: {value}")
            if embed_parts:
                text = " | ".join(embed_parts)

        transformed.append({
            "id": msg_id,
            "timestamp": msg.get("timestamp", ""),
            "user": resolve_author(author),
            "text": text,
            "permalink": permalink,
            "reference_id": reference_id,
        })

    transformed.sort(key=lambda m: m["timestamp"])

    return {
        "channel": f"#{channel_name}",
        "messages": transformed,
    }


def load_channel_export(json_path: Path) -> dict:
    """Load a single DiscordChatExporter JSON file."""
    with open(json_path) as f:
        return json.load(f)


def load_channels_config(config_path: Path) -> dict:
    """Load channels.yaml configuration."""
    with open(config_path) as f:
        return yaml.safe_load(f)


def convert_export(
    export_dir: Path,
    output_dir: Path,
    config_path: Path,
) -> None:
    """Convert DiscordChatExporter JSON exports to TOON files.

    Reads channels.yaml for guild info and channel list,
    processes each JSON file in the export directory, writes TOON output.
    """
    config = load_channels_config(config_path)
    guild_id = config.get("guild_id", "unknown")

    channel_lookup = {ch["id"]: ch for ch in config.get("channels", [])}

    output_dir.mkdir(parents=True, exist_ok=True)

    for json_file in sorted(export_dir.glob("*.json")):
        data = load_channel_export(json_file)
        channel_meta = data.get("channel", {})
        channel_id = channel_meta.get("id", "")

        if channel_lookup and channel_id not in channel_lookup:
            continue

        channel_config = channel_lookup.get(channel_id, {})
        channel_name = channel_config.get("name", channel_meta.get("name", channel_id))

        messages = data.get("messages", [])
        if not messages:
            continue

        result = transform_channel(
            messages=messages,
            channel_name=channel_name,
            channel_id=channel_id,
            guild_id=guild_id,
        )

        toon_path = output_dir / f"{channel_name}.toon"
        toon_path.write_text(encode(result) + "\n")
        print(f"  {channel_name}: {len(messages)} messages -> {toon_path}")


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Convert Discord JSON exports to TOON format")
    parser.add_argument("--export-dir", required=True, help="Path to DiscordChatExporter JSON output directory")
    parser.add_argument("--output-dir", required=True, help="Path to write TOON output files")
    parser.add_argument("--config", default="channels.yaml", help="Path to channels.yaml config")
    args = parser.parse_args()

    export_dir = Path(args.export_dir)
    output_dir = Path(args.output_dir)
    config_path = Path(args.config)

    if not export_dir.exists():
        print(f"Error: export directory not found: {export_dir}", file=sys.stderr)
        sys.exit(1)

    if not config_path.exists():
        print(f"Error: config file not found: {config_path}", file=sys.stderr)
        sys.exit(1)

    convert_export(export_dir, output_dir, config_path)


if __name__ == "__main__":
    main()
