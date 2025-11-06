const UserModel = require("./user.model");
const BaseRepository = require("./baseRepository");

class UserRepository extends BaseRepository {
  constructor() {
    super(UserModel);
  }
  // Hier kommen userspezifische Methoden hinzu
}

module.exports = UserRepository;
