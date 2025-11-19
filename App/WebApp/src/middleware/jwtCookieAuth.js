// ./src/middleware/jwtCookieAuth.js
// Rekonstruiert einen Benutzer aus kurzlebigem Access Token oder rotiert dieses via Refresh Token.

const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../features/user/user.model");

/**
 * Liest das Cookie 'auth_token', validiert das JWT und führt ein req.login() aus,
 * so dass nachfolgende Middleware (z.B. ensureAuthenticated) wie gewohnt funktioniert.
 */
async function jwtCookieAuth(req, res, next) {
  // Wenn bereits eine Session besteht, nichts tun
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }

  const accessToken = req.cookies ? req.cookies.auth_token : null;
  const refreshCookie = req.cookies ? req.cookies.refresh_token : null;
  const secret = process.env.JWT_SECRET;
  if (!secret) return next();

  if (accessToken) {
    try {
      const payload = jwt.verify(accessToken, secret);
      if (payload && payload.id) {
        const user = await User.findById(payload.id);
        if (user) {
          return req.login(user, () => next());
        }
        res.clearCookie("auth_token");
      }
    } catch (err) {
      // Token möglicherweise abgelaufen -> wir versuchen Refresh
    }
  }

  if (!refreshCookie) return next();

  // Refresh-Format: userId.randomHex
  const parts = refreshCookie.split(".");
  if (parts.length !== 2) {
    res.clearCookie("refresh_token");
    return next();
  }
  const [userId, raw] = parts;
  try {
    const user = await User.findById(userId);
    if (!user) {
      res.clearCookie("refresh_token");
      return next();
    }
    const hash = crypto.createHash("sha256").update(raw).digest("hex");
    const matchIndex = (user.refreshTokens || []).findIndex(
      (t) => t.tokenHash === hash
    );
    if (matchIndex === -1) {
      // Ungültiger Refresh
      res.clearCookie("refresh_token");
      return next();
    }
    // Rotation: entferne alten Hash
    user.refreshTokens.splice(matchIndex, 1);

    // Erzeuge neues Access + Refresh
    const newAccess = jwt.sign({ id: user.id }, secret, { expiresIn: "15m" });
    const newRefreshRaw = crypto.randomBytes(32).toString("hex");
    const newRefreshHash = crypto
      .createHash("sha256")
      .update(newRefreshRaw)
      .digest("hex");
    user.refreshTokens.push({ tokenHash: newRefreshHash });
    await user.save();

    const cookieSecure = process.env.COOKIE_SECURE === "true";
    res.cookie("auth_token", newAccess, {
      httpOnly: true,
      sameSite: "strict",
      secure: cookieSecure,
      maxAge: 15 * 60 * 1000,
    });
    res.cookie("refresh_token", `${user.id}.${newRefreshRaw}`, {
      httpOnly: true,
      sameSite: "strict",
      secure: cookieSecure,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return req.login(user, () => next());
  } catch (ex) {
    res.clearCookie("refresh_token");
    return next();
  }
}

module.exports = { jwtCookieAuth };
