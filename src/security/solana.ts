const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const BASE58_VALUES = new Map([...BASE58_ALPHABET].map((char, index) => [char, index]));

function decodeBase58(value: string): Uint8Array | null {
  if (!value || [...value].some((char) => !BASE58_VALUES.has(char))) return null;

  const bytes = [0];
  for (const char of value) {
    const digit = BASE58_VALUES.get(char)!;
    let carry = digit;

    for (let i = 0; i < bytes.length; i += 1) {
      const next = bytes[i] * 58 + carry;
      bytes[i] = next & 0xff;
      carry = next >> 8;
    }

    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }

  for (const char of value) {
    if (char !== "1") break;
    bytes.push(0);
  }

  bytes.reverse();
  return Uint8Array.from(bytes);
}

export function isSolanaPublicKey(value: string): boolean {
  const decoded = decodeBase58(value);
  return decoded?.length === 32;
}

export function isSolanaTransactionSignature(value: string): boolean {
  const decoded = decodeBase58(value);
  return decoded?.length === 64;
}

export function classifySolanaIdentifier(
  value: string,
): "account" | "transaction" | null {
  if (isSolanaPublicKey(value)) return "account";
  if (isSolanaTransactionSignature(value)) return "transaction";
  return null;
}
