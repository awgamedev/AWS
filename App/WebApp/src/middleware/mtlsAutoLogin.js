// ./src/middleware/mtlsAutoLogin.js
// Automatically logs a user in based on mTLS client certificate headers forwarded by nginx.
// Preconditions:
//   - nginx must forward: X-Ssl-Client-Verify, X-Ssl-Client-Subject, X-Ssl-Client-Serial
//   - ssl_verify_client on (or optional with additional logic) in the reverse proxy
//   - Express app uses passport + sessions (req.login available)
// Enable via env: MTLS_AUTO_LOGIN_ENABLED=true
// Optional env vars:
//   MTLS_DN_ATTRIBUTE=CN                 -> Which DN attribute to read (CN, EMAILADDRESS, SERIALNUMBER, etc.)
//   MTLS_MATCH_FIELD=username            -> Which user field to match against (username | email)
//   MTLS_FALLBACK_TO_EMAIL=true          -> If attribute looks like email always try email first
//   MTLS_REQUIRE_SUCCESS=true            -> Require X-Ssl-Client-Verify === 'SUCCESS'
//   MTLS_ALLOWED_ROLES=admin,user        -> Restrict auto login to these roles (comma-separated)
//   MTLS_AUTO_PROVISION_ENABLED=true     -> Create user automatically if not found
//   MTLS_AUTO_PROVISION_DEFAULT_ROLE=user-> Role assigned to auto-provisioned user
//   MTLS_AUTO_PROVISION_USE_OU_FOR_ROLE=true -> Use DN OU as role if present & valid
//   MTLS_AUTO_PROVISION_RANDOM_PASSWORD_LENGTH=32 -> Length of generated password

const User = require("../features/user/user.model");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

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

// Returns true if auto-provisioning of users is enabled and not explicitly disabled
function isAutoProvisioningAllowed() {
  return (
    process.env.MTLS_AUTO_PROVISION_ENABLED === "true" &&
    process.env.MTLS_AUTO_PROVISION_ALLOW !== "false"
  );
}

// Extracts the candidate value from the DN map, falling back to serialHeader if needed
function getCandidateFromDN(dn, dnAttribute, serialHeader) {
  let candidate = dn[dnAttribute];
  // If the attribute is SERIALNUMBER and not present in DN, use the serial header
  if (!candidate && dnAttribute === "SERIALNUMBER") candidate = serialHeader;
  return candidate;
}

// Attempts to find a user by the candidate value, using email or username as appropriate
async function findUserByCandidate(candidate, matchFieldEnv, looksLikeEmail) {
  let user = null;
  // If candidate looks like an email and fallback is enabled, try email first
  if (looksLikeEmail && process.env.MTLS_FALLBACK_TO_EMAIL === "true") {
    user = await User.findOne({ email: candidate });
  }
  if (!user) {
    if (matchFieldEnv === "email") {
      user = await User.findOne({ email: candidate });
    } else {
      // Try username, then (if candidate looks like email) try email again
      user =
        (await User.findOne({ username: candidate })) ||
        (looksLikeEmail ? await User.findOne({ email: candidate }) : null);
    }
  }
  return user;
}

// Attempts to auto-provision a user if not found, based on DN and environment config
// Returns the new user, an existing user (if race condition), or null if not possible
async function autoProvisionUser({
  candidate,
  matchFieldEnv,
  looksLikeEmail,
  dn,
  req,
}) {
  // Determine role to assign (default or from OU if allowed)
  const defaultRole = process.env.MTLS_AUTO_PROVISION_DEFAULT_ROLE || "user";
  let roleToAssign = defaultRole;
  const dnRoleCandidate = dn["OU"];
  if (
    process.env.MTLS_AUTO_PROVISION_USE_OU_FOR_ROLE === "true" &&
    dnRoleCandidate &&
    ["user", "admin"].includes(dnRoleCandidate)
  ) {
    roleToAssign = dnRoleCandidate;
  }

  // Determine username and email
  // Clean up candidate: trim and replace spaces with dots
  let cleanedCandidate =
    typeof candidate === "string"
      ? candidate.trim().replace(/\s+/g, ".")
      : candidate;
  let username = cleanedCandidate;
  let email = null;
  // If candidate looks like email, use it, else null
  if (looksLikeEmail) {
    email = cleanedCandidate;
  }
  // If matching field is email but candidate is not an email, skip provisioning
  if (!email && matchFieldEnv === "email") {
    if (req.logger)
      req.logger.warn(
        `[mTLS AutoLogin] Auto-provision skipped: candidate '${cleanedCandidate}' not an email while MTLS_MATCH_FIELD=email.`
      );
    return null;
  }
  // If no email, fabricate a deterministic placeholder
  if (!email) {
    email = `${cleanedCandidate}@onis.local`;
  }
  // Validate email format, fix if needed
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!emailRegex.test(email)) {
    // Try to fix: replace spaces with dots and trim again
    email = email.trim().replace(/\s+/g, ".");
    if (!emailRegex.test(email)) {
      // If still invalid, fallback to placeholder
      email = `${cleanedCandidate}@onis.local`;
    }
  }

  try {
    // Generate a random password (required by schema)
    const pwdLength = parseInt(
      process.env.MTLS_AUTO_PROVISION_RANDOM_PASSWORD_LENGTH || "32",
      10
    );
    const rawPassword = crypto
      .randomBytes(Math.ceil(pwdLength / 2))
      .toString("hex")
      .slice(0, pwdLength);
    const hashedPassword = await bcrypt.hash(rawPassword, 12);

    // Create the user
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      role: roleToAssign,
    });
    if (req.logger)
      req.logger.info(
        `[mTLS AutoLogin] Auto-provisioned new user '${username}' role='${roleToAssign}' (email='${email}').`
      );
    return user;
  } catch (provisionErr) {
    // Handle race condition: user was created in parallel
    if (provisionErr && provisionErr.code === 11000) {
      const user = await User.findOne({
        $or: [{ username }, { email }],
      });
      if (req.logger)
        req.logger.info(
          `[mTLS AutoLogin] Duplicate during provisioning; re-fetched existing user '${user?.username}'.`
        );
      return user;
    } else {
      if (req.logger)
        req.logger.error(
          `[mTLS AutoLogin] Auto-provision failed for '${candidate}':`,
          provisionErr
        );
      return null;
    }
  }
}

// Checks if the user's role is allowed for auto-login (if restriction is set)
function isRoleAllowed(user) {
  const allowedRolesRaw = process.env.MTLS_ALLOWED_ROLES;
  if (!allowedRolesRaw) return true;
  const allowed = allowedRolesRaw.split(",").map((r) => r.trim());
  return allowed.includes(user.role);
}

// Logs a message using req.logger if available
function logAndNext(req, msg) {
  if (req.logger) req.logger.info(msg);
}

// Main Express middleware for mTLS auto-login
// Attempts to authenticate a user based on client certificate headers
async function mtlsAutoLogin(req, res, next) {
  try {
    // Fast exit if already authenticated or feature is disabled
    if (req.isAuthenticated()) {
      return next();
    }

    if (process.env.MTLS_AUTO_LOGIN_ENABLED !== "true") {
      return next();
    }

    // Extract mTLS headers
    const verifyHeader = req.get("X-Ssl-Client-Verify");
    const subjectHeader = req.get("X-Ssl-Client-Subject");
    const serialHeader = req.get("X-Ssl-Client-Serial");
    if (!subjectHeader) return next();

    // If strict success required, only proceed if client verified
    if (
      process.env.MTLS_REQUIRE_SUCCESS === "true" &&
      verifyHeader !== "SUCCESS"
    ) {
      return next();
    }

    // Parse the DN from the subject header
    const dn = parseDistinguishedName(subjectHeader);
    if (!Object.keys(dn).length) return next();
    const dnAttribute = (process.env.MTLS_DN_ATTRIBUTE || "CN").toUpperCase();
    const candidate = getCandidateFromDN(dn, dnAttribute, serialHeader);
    if (!candidate) return next();

    // Determine if candidate looks like an email and which field to match
    const looksLikeEmail = /@/.test(candidate);
    const matchFieldEnv = (
      process.env.MTLS_MATCH_FIELD || "username"
    ).toLowerCase();

    // Try to find an existing user
    let user = await findUserByCandidate(
      candidate,
      matchFieldEnv,
      looksLikeEmail
    );

    // If not found, try auto-provisioning if allowed
    if (!user && isAutoProvisioningAllowed()) {
      user = await autoProvisionUser({
        candidate,
        matchFieldEnv,
        looksLikeEmail,
        dn,
        req,
      });
      if (!user) {
        logAndNext(
          req,
          `[mTLS AutoLogin] No user matched for DN attribute '${dnAttribute}' value '${candidate}'. Auto-provisioning is disabled or failed.`
        );
        return next();
      }
    } else if (!user) {
      // No user found and auto-provisioning not allowed
      logAndNext(
        req,
        `[mTLS AutoLogin] No user matched for DN attribute '${dnAttribute}' value '${candidate}'. Auto-provisioning is disabled.`
      );
      return next();
    }

    // Check if user's role is allowed
    if (!isRoleAllowed(user)) {
      logAndNext(
        req,
        `[mTLS AutoLogin] User '${user.username}' role '${user.role}' not in allowed roles.`
      );
      return next();
    }

    // Log the user in using Passport
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
