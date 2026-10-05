/**
 * Discord custom emoji string'ini buton/select için object'e çevirir.
 *
 * Girdi: '<:isim:12345>' veya '<a:isim:12345>'
 * Çıktı: { id: '12345', name: 'isim', animated: false }
 *
 * Eğer unicode emoji ise: '🔨' → '🔨' (direkt string döner, object değil)
 */
function parseEmoji(emojiStr) {
  if (!emojiStr) return null;

  // Custom emoji: <:name:id> veya <a:name:id>
  const customMatch = emojiStr.match(/^<(a?):([^:]+):(\d+)>$/);
  if (customMatch) {
    return {
      animated: customMatch[1] === 'a',
      name:     customMatch[2],
      id:       customMatch[3],
    };
  }

  // Unicode emoji — direkt döndür
  return emojiStr;
}

module.exports = { parseEmoji };
