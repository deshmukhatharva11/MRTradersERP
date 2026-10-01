// =============================================================
// MR Traders ERP — Redacting Logger
// =============================================================
// Prevents tokens, keys, passwords, and PII from appearing in
// log output.  Drop-in replacement for console.log / .warn / .error.
// =============================================================
'use strict';

const REDACT_PATTERNS = [
  // Tokens / Keys / Secrets
  /(?:Bearer\s+)[A-Za-z0-9\-._~+\/]+=*/gi,
  /(?:token|key|password|secret|passwd|authorization|x-app-key)["\s:=]+[^\s,;"'}{)(\]]{4,}/gi,
  /eyJ[A-Za-z0-9\-_]+\.eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_.+/=]*/g,  // JWT
  // Email addresses (PII)
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  // Pakistani CNIC / phone (PII relevant to MR Traders)
  /\b\d{5}-?\d{7}-?\d\b/g,      // CNIC
  /\b0[37]\d{2}-?\d{7}\b/g,     // PK phone
];

function redact(value) {
  if (typeof value !== 'string') {
    try {
      value = JSON.stringify(value);
    } catch {
      value = String(value);
    }
  }
  let result = value;
  for (const pattern of REDACT_PATTERNS) {
    // Reset lastIndex for global patterns
    pattern.lastIndex = 0;
    result = result.replace(pattern, '[REDACTED]');
  }
  return result;
}

function createLogger(namespace) {
  const prefix = `[${namespace}]`;
  const ts = () => new Date().toISOString();

  return {
    info(...args)  { console.log(ts(), prefix, 'INFO ', ...args.map(redact)); },
    warn(...args)  { console.warn(ts(), prefix, 'WARN ', ...args.map(redact)); },
    error(...args) { console.error(ts(), prefix, 'ERROR', ...args.map(redact)); },
    debug(...args) {
      if (process.env.NODE_ENV !== 'production') {
        console.debug(ts(), prefix, 'DEBUG', ...args.map(redact));
      }
    },
  };
}

module.exports = { createLogger, redact };
