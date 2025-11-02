const passport = require("passport");
const JwtStrategy = require("passport-jwt").Strategy;
const ExtractJwt = require("passport-jwt").ExtractJwt;
const LocalStrategy = require("passport-local").Strategy; // NEU: Local Strategy
const bcrypt = require("bcryptjs"); // NEU: Für Passwort-Hashing

// Importiere dein Benutzermodell
const User = require("../models/User");

// Holt den geheimen Schlüssel aus den Umgebungsvariablen
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET ist nicht in den Umgebungsvariablen definiert.");
}

// ---------------------------------------------------------------------
// 1. JWT Strategy (BLEIBT UNVERÄNDERT)
// ---------------------------------------------------------------------

const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: JWT_SECRET,
};

passport.use(
  "jwt", // Kann optional benannt werden, hier explizit 'jwt'
  new JwtStrategy(jwtOptions, async (jwt_payload, done) => {
    try {
      // Suche den Benutzer anhand der ID aus dem Payload
      const user = await User.findById(jwt_payload.id);

      if (user) {
        return done(null, user);
      } else {
        return done(null, false);
      }
    } catch (error) {
      return done(error, false);
    }
  })
);

// ---------------------------------------------------------------------
// 2. LOCAL Strategy (FÜR DEN LOGIN-ENDPUNKT)
// ---------------------------------------------------------------------

passport.use(
  "local", // Strategie benannt als 'local'
  new LocalStrategy(
    {
      // Konfiguriert, welche Felder aus req.body verwendet werden sollen
      usernameField: "email", // Wir verwenden 'email' als Anmeldefeld
      passwordField: "password",
    },
    async (email, password, done) => {
      try {
        // Finde den Benutzer in der Datenbank
        const user = await User.findOne({ email: email });

        if (!user) {
          // Benutzer nicht gefunden
          return done(null, false, { message: "Falsche E-Mail-Adresse." });
        }

        // Passwort vergleichen (gehashtes Passwort in DB vs. Klartext-Eingabe)
        const isMatch = await bcrypt.compare(password, user.password);

        if (isMatch) {
          // Authentifizierung erfolgreich
          return done(null, user); // 'user' wird an serializeUser übergeben
        } else {
          // Passwort ist falsch
          return done(null, false, { message: "Falsches Passwort." });
        }
      } catch (err) {
        return done(err);
      }
    }
  )
);

// ---------------------------------------------------------------------
// 3. Serialisierung/Deserialisierung (FÜR SESSIONS BEI HTML-APPS)
// ---------------------------------------------------------------------

// Speichert nur die ID des Benutzers in der Session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Ruft den gesamten Benutzer anhand der ID aus der Session ab
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user); // Fügt den Benutzer zu req.user hinzu
  } catch (err) {
    done(err, null);
  }
});
