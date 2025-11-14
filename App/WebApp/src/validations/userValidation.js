const validateUserData = (req, password) => {
  if (!password) throw new Error(req.__("ERROR_PASSWORD_REQUIRED"));
  if (password.length < 6) throw new Error(req.__("ERROR_PASSWORD_LENGTH"));
};

const validateEmailUniqueness = async (req, email, entity) => {
  if (email !== entity.email) {
    const existingUser = await User.findOne({ email });
    if (existingUser) throw new Error(req.__("ERROR_EMAIL_USED_BY_OTHER"));
  }
};

module.exports = {
  validateUserData,
  validateEmailUniqueness,
};
