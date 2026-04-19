def make_permalink(guild_id: str, channel_id: str, message_id: str) -> str:
    """Construct a Discord permalink from guild, channel, and message IDs.

    Discord permalinks follow the pattern:
        https://discord.com/channels/{guild_id}/{channel_id}/{message_id}
    """
    return f"https://discord.com/channels/{guild_id}/{channel_id}/{message_id}"
