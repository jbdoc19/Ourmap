// Emoji utilities and constants

export const EMOJI_MAP = {
  pin: '📍',
  map: '🗺️',
  travel: '✈️',
  location: '📌',
  world: '🌍',
  camera: '📷',
  star: '⭐',
  heart: '❤️',
} as const;

export type EmojiKey = keyof typeof EMOJI_MAP;

export function getEmoji(key: EmojiKey): string {
  return EMOJI_MAP[key];
}

export function getAllEmojis(): typeof EMOJI_MAP {
  return EMOJI_MAP;
}
