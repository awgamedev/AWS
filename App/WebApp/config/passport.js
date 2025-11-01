const passport = require("passport");
const JwtStrategy = require("passport-jwt").Strategy;
const ExtractJwt = require("passport-jwt").ExtractJwt;

// Importiere dein Benutzermodell, um den Benutzer anhand der ID zu suchen
const User = require("../models/User"); // Passe den Pfad zu deinem User-Modell an!

// Holt den geheimen Schlüssel aus den Umgebungsvariablen
// Wichtig: Stelle sicher, dass du eine .env-Datei mit einem SECRET_KEY hast!
const SECRET_KEY = process.env.JWT_SECRET;

if (!SECRET_KEY) {
  // Diese Überprüfung ist wichtig, falls der Schlüssel fehlt
  throw new Error("JWT_SECRET ist nicht in den Umgebungsvariablen definiert.");
}

// Konfigurations-Objekt für die JWT-Strategie
const options = {
  // Definiert, wie das JWT aus der Anfrage extrahiert wird (hier: aus dem Authorization: Bearer Header)
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  // Der geheime Schlüssel zur Verifizierung der Signatur des Tokens
  secretOrKey: SECRET_KEY,
};

// Definiere die JWT-Strategie für Passport
passport.use(
  new JwtStrategy(options, async (jwt_payload, done) => {
    try {
      // Die jwt_payload enthält die Daten, die du beim Login im Token gespeichert hast (z.B. user ID)

      // 1. Suche den Benutzer anhand der ID aus dem Payload
      const user = await User.findById(jwt_payload.id); // Annahme: Du speicherst die User-ID als 'id' im Token

      if (user) {
        // Benutzer gefunden: Authentifizierung erfolgreich
        // 'user' wird zu req.user in der geschützten Route hinzugefügt
        return done(null, user);
      } else {
        // Benutzer nicht gefunden: Token ist gültig, aber der Benutzer existiert nicht mehr
        return done(null, false);
      }
    } catch (error) {
      // Fehler bei der Datenbankabfrage
      return done(error, false);
    }
  })
);
