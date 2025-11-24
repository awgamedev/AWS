// ./src/middleware/mtlsAutoLogin.js
// Automatically logs a user in based on mTLS client certificate headers forwarded by nginx.
// Preconditions:
//   - nginx must forward: X-Ssl-Client-Verify, X-Ssl-Client-Subject, X-Ssl-Client-Serial
//   - ssl_verify_client on (or optional with additional logic) in the reverse proxy
//   - Express app uses passport + sessions (req.login available)
// Enable via env: MTLS_AUTO_LOGIN_ENABLED=true
// Optional env vars:
//   MTLS_DN_ATTRIBUTE=CN            -> Which DN attribute to read (CN, EMAILADDRESS, SERIALNUMBER, etc.)
//   MTLS_MATCH_FIELD=username       -> Which user field to match against (username | email)
//   MTLS_FALLBACK_TO_EMAIL=true     -> If attribute looks like email always try email first
//   MTLS_REQUIRE_SUCCESS=true       -> Require X-Ssl-Client-Verify === 'SUCCESS'
//   MTLS_ALLOWED_ROLES=admin,user   -> Restrict auto login to these roles (comma-separated)

const User = require("../features/user/user.model");

function parseDistinguishedName(dnRaw) {
  // Accept formats like: 'C=DE, ST=Bavaria, O=Example, CN=john' OR '/C=DE/ST=Bavaria/O=Example/CN=john'
  if (!dnRaw || typeof dnRaw !== "string") return {};
  let cleaned = dnRaw.trim();
  if (cleaned.startsWith("/")) {
    cleaned = cleaned.substring(1); // remove leading slash for slash-delimited format
  }
  // Normalize separators to comma
  cleaned = cleaned.replace(/\//g, ",");
  const parts = cleaned.split(/,(?=(?:[^=]+=))/); // split on commas that precede key=value
  const map = {};
  for (const part of parts) {
    const [k, v] = part.split("=");
    if (!k || !v) continue;
    map[k.trim().toUpperCase()] = v.trim();
  }
  return map;
}

async function mtlsAutoLogin(req, res, next) {
  try {
    // Fast exits
    if (req.isAuthenticated()) return next();

    if (process.env.MTLS_AUTO_LOGIN_ENABLED !== "true") return next();

    // Ensure request came through TLS reverse proxy (heuristic)
    // Optionally you could check req.secure or add a shared secret header.

    const verifyHeader = req.get("X-Ssl-Client-Verify");
    const subjectHeader = req.get("X-Ssl-Client-Subject");
    const serialHeader = req.get("X-Ssl-Client-Serial");

    if (!subjectHeader) return next(); // nothing to parse

    if (
      process.env.MTLS_REQUIRE_SUCCESS === "true" &&
      verifyHeader !== "SUCCESS"
    ) {
      return next();
    }

    const dn = parseDistinguishedName(subjectHeader);
    if (!Object.keys(dn).length) return next();

    const dnAttribute = (process.env.MTLS_DN_ATTRIBUTE || "CN").toUpperCase();
    let candidate = dn[dnAttribute];
    if (!candidate && dnAttribute === "SERIALNUMBER") candidate = serialHeader; // fallback to serial header
    if (!candidate) return next();

    const looksLikeEmail = /@/.test(candidate);
    const matchFieldEnv = (
      process.env.MTLS_MATCH_FIELD || "username"
    ).toLowerCase();

    let user = null;
    // Fallback logic: if value looks like an email use email first (configurable)
    if (looksLikeEmail && process.env.MTLS_FALLBACK_TO_EMAIL === "true") {
      user = await User.findOne({ email: candidate });
    }
    if (!user) {
      if (matchFieldEnv === "email") {
        user = await User.findOne({ email: candidate });
      } else {
        // username
        user =
          (await User.findOne({ username: candidate })) ||
          (looksLikeEmail ? await User.findOne({ email: candidate }) : null);
      }
    }

    if (!user) {
      if (req.logger)
        req.logger.info(
          `[mTLS AutoLogin] No user matched for DN attribute '${dnAttribute}' value '${candidate}'.`
        );
      return next();
    }

    // Optional role restriction
    const allowedRolesRaw = process.env.MTLS_ALLOWED_ROLES;
    if (allowedRolesRaw) {
      const allowed = allowedRolesRaw.split(",").map((r) => r.trim());
      if (!allowed.includes(user.role)) {
        if (req.logger)
          req.logger.info(
            `[mTLS AutoLogin] User '${user.username}' role '${user.role}' not in allowed roles.`
          );
        return next();
      }
    }

    // Perform passport login
    req.login(user, (err) => {
      if (err) {
        if (req.logger)
          req.logger.error("[mTLS AutoLogin] Error in req.login", err);
        return next();
      }
      if (req.logger)
        req.logger.info(
          `[mTLS AutoLogin] Logged in as '${user.username}' via client certificate.`
        );
      next();
    });
  } catch (e) {
    if (req.logger) req.logger.error("[mTLS AutoLogin] Unexpected error", e);
    next();
  }
}

module.exports = { mtlsAutoLogin };
