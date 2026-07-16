/**
 * Node's fetch/undici can't send a multipart filename containing characters
 * outside Latin-1 (throws "Cannot convert argument to a ByteString…") -
 * common with filenames copied from Word/PowerPoint that carry a smart
 * bullet/quote character. The upload still needs to travel as a File with
 * an ASCII-safe name; the real name is sent alongside as a plain text field
 * and used for display/storage instead.
 */
export function isAsciiSafe(name: string) {
  return /^[\x00-\x7F]*$/.test(name);
}

export function asciiSafeFileName(name: string) {
  const dot = name.lastIndexOf(".");
  const ext = dot > -1 ? name.slice(dot).replace(/[^\x00-\x7F]/g, "") : "";
  return `upload${ext || ""}`;
}
