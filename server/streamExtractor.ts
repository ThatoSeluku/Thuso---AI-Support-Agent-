type ExtractorState =
  | 'SEEKING_KEY'
  | 'IN_KEY'
  | 'AFTER_KEY'
  | 'SEEKING_VALUE'
  | 'IN_REPLY_STRING'
  | 'SKIP_STRING'
  | 'SKIP_NESTED'
  | 'SKIP_PRIMITIVE'
  | 'DONE';

/**
 * Incrementally extracts and unescapes the `"reply"` string property from a
 * streamed JSON response matching THUSO_RESPONSE_SCHEMA.
 */
export class ReplyJsonStreamExtractor {
  private state: ExtractorState = 'SEEKING_KEY';
  private keyBuf = '';
  private isReplyKey = false;
  private escapePending = false;
  private unicodeHexPending: string | null = null;
  private skipNestedDepth = 0;
  private skipNestedInString = false;
  private extractedReply = '';

  push(chunk: string): string {
    if (!chunk || this.state === 'DONE') return '';

    let delta = '';

    for (let i = 0; i < chunk.length; i += 1) {
      const ch = chunk[i];

      if (this.state === 'DONE') break;

      switch (this.state) {
        case 'SEEKING_KEY': {
          if (ch === '"') {
            this.keyBuf = '';
            this.escapePending = false;
            this.state = 'IN_KEY';
          }
          break;
        }

        case 'IN_KEY': {
          if (this.escapePending) {
            this.keyBuf += ch;
            this.escapePending = false;
          } else if (ch === '\\') {
            this.escapePending = true;
          } else if (ch === '"') {
            this.isReplyKey = this.keyBuf === 'reply';
            this.state = 'AFTER_KEY';
          } else {
            this.keyBuf += ch;
          }
          break;
        }

        case 'AFTER_KEY': {
          if (ch === ':') {
            this.state = 'SEEKING_VALUE';
          }
          break;
        }

        case 'SEEKING_VALUE': {
          if (/\s/.test(ch)) break;
          if (ch === '"') {
            this.escapePending = false;
            this.unicodeHexPending = null;
            this.state = this.isReplyKey ? 'IN_REPLY_STRING' : 'SKIP_STRING';
          } else if (ch === '{' || ch === '[') {
            this.skipNestedDepth = 1;
            this.skipNestedInString = false;
            this.escapePending = false;
            this.state = 'SKIP_NESTED';
          } else {
            this.state = 'SKIP_PRIMITIVE';
          }
          break;
        }

        case 'IN_REPLY_STRING': {
          if (this.unicodeHexPending !== null) {
            if (/[0-9a-fA-F]/.test(ch)) {
              this.unicodeHexPending += ch;
              if (this.unicodeHexPending.length === 4) {
                const decoded = String.fromCharCode(
                  Number.parseInt(this.unicodeHexPending, 16)
                );
                delta += decoded;
                this.extractedReply += decoded;
                this.unicodeHexPending = null;
              }
            } else {
              const raw = `\\u${this.unicodeHexPending}${ch}`;
              delta += raw;
              this.extractedReply += raw;
              this.unicodeHexPending = null;
            }
            break;
          }

          if (this.escapePending) {
            this.escapePending = false;
            if (ch === 'u') {
              this.unicodeHexPending = '';
              break;
            }
            const unescaped =
              ch === 'n'
                ? '\n'
                : ch === 'r'
                  ? '\r'
                  : ch === 't'
                    ? '\t'
                    : ch === 'b'
                      ? '\b'
                      : ch === 'f'
                        ? '\f'
                        : ch;
            delta += unescaped;
            this.extractedReply += unescaped;
            break;
          }

          if (ch === '\\') {
            this.escapePending = true;
          } else if (ch === '"') {
            this.state = 'DONE';
          } else {
            delta += ch;
            this.extractedReply += ch;
          }
          break;
        }

        case 'SKIP_STRING': {
          if (this.escapePending) {
            this.escapePending = false;
          } else if (ch === '\\') {
            this.escapePending = true;
          } else if (ch === '"') {
            this.state = 'SEEKING_KEY';
          }
          break;
        }

        case 'SKIP_NESTED': {
          if (this.skipNestedInString) {
            if (this.escapePending) {
              this.escapePending = false;
            } else if (ch === '\\') {
              this.escapePending = true;
            } else if (ch === '"') {
              this.skipNestedInString = false;
            }
          } else if (ch === '"') {
            this.skipNestedInString = true;
          } else if (ch === '{' || ch === '[') {
            this.skipNestedDepth += 1;
          } else if (ch === '}' || ch === ']') {
            this.skipNestedDepth -= 1;
            if (this.skipNestedDepth <= 0) {
              this.state = 'SEEKING_KEY';
            }
          }
          break;
        }

        case 'SKIP_PRIMITIVE': {
          if (ch === ',') {
            this.state = 'SEEKING_KEY';
          } else if (ch === '}') {
            this.state = 'DONE';
          }
          break;
        }
      }
    }

    return delta;
  }

  getExtractedReply(): string {
    return this.extractedReply;
  }
}
