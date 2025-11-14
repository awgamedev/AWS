const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const { ensureAuthenticated } = require("../middleware/auth");
const { renderView } = require("../utils/view-renderer");

// 1. Display user list (GET /user/list)
router.get("/user/list", ensureAuthenticated, async (req, res) => {
  const title = req.__("USER_LIST_PAGE_TITLE");

  try {
    const items = await User.find({});
    renderView(req, res, "user/list", title, {
      items: items.map((item) => (item.toObject ? item.toObject() : item)),
    });
  } catch (err) {
    req.logger.error("Error fetching user list:", err);
    return renderErrorView(req, res, "USER_LIST_LOAD_ERROR", 500);
  }
});

// 2a. Show form to create a new user (GET /create-user)
router.get("/create-user", ensureAuthenticated, (req, res) => {
  const title = req.__("CREATE_USER_PAGE_TITLE");
  renderView(req, res, "user_form", title, {
    entityToModify: {},
    isEditing: false,
  });
});

// 3a. Action to save a new user (POST /create-user)
router.post("/create-user", ensureAuthenticated, async (req, res) => {
  const data = req.body;
  const { email, password } = data;

  try {
    validateUserData(email, password);
    data.password = await hashPassword(password);

    const existingUser = await User.findOne({ email });
    if (existingUser) throw new Error(req.__("ERROR_EMAIL_EXISTS"));

    const newUser = new User(data);
    await newUser.save();
    res.redirect("/user/list");
  } catch (err) {
    req.logger.error("Error creating user:", err);
    return renderErrorView(req, res, "USER_CREATE_ERROR", 500, err.message);
  }
});

// 2b. Show form to edit an existing user (GET /modify-user/:id)
router.get("/modify-user/:id", ensureAuthenticated, async (req, res) => {
  const itemId = req.params.id;
  const title = req.__("EDIT_USER_PAGE_TITLE");

  try {
    const entityToModify = await User.findById(itemId);
    if (!entityToModify)
      return renderErrorView(req, res, "USER_NOT_FOUND", 404);

    renderView(req, res, "user_form", title, {
      entityToModify: entityToModify.toObject(),
      isEditing: true,
    });
  } catch (err) {
    req.logger.error("Error fetching user data:", err);
    return renderErrorView(req, res, "USER_DETAILS_LOAD_ERROR", 500);
  }
});

// 3b. Action to save an existing user (POST /modify-user)
router.post("/modify-user", ensureAuthenticated, async (req, res) => {
  const { id, email, password } = req.body;

  try {
    const entity = await User.findById(id);
    if (!entity) return renderErrorView(req, res, "USER_NOT_FOUND", 404);

    await validateEmailUniqueness(email, entity);
    if (password) entity.password = await hashPassword(password);

    entity.username = req.body.username;
    entity.email = email;
    entity.role = req.body.role || "user";

    await entity.save();
    res.redirect("/user/list");
  } catch (err) {
    req.logger.error("Error updating user:", err);
    return renderErrorView(req, res, "USER_UPDATE_ERROR", 500, err.message);
  }
});

// 4. Show confirmation page for deletion (GET /user/list/confirm-delete/:id)
router.get(
  "/user/list/confirm-delete/:id",
  ensureAuthenticated,
  async (req, res) => {
    const itemId = req.params.id;
    const title = req.__("CONFIRM_DELETE_PAGE_TITLE");

    try {
      const entityToDelete = await User.findById(itemId);
      if (!entityToDelete)
        return renderErrorView(req, res, "USER_NOT_FOUND", 404);

      renderView(req, res, "user_delete_confirm", title, {
        entityToDelete: entityToDelete.toObject(),
      });
    } catch (err) {
      req.logger.error("Error fetching user data for deletion:", err);
      return renderErrorView(req, res, "USER_DELETE_DETAILS_ERROR", 500);
    }
  }
);

// 5. Final action to delete an entity (POST /user/list/delete/:id)
router.post("/user/list/delete/:id", ensureAuthenticated, async (req, res) => {
  const itemId = req.params.id;

  try {
    const deletedItem = await User.findByIdAndDelete(itemId);
    if (!deletedItem) return renderErrorView(req, res, "USER_NOT_FOUND", 404);

    res.redirect("/user/list");
  } catch (err) {
    req.logger.error("Error deleting user:", err);
    return renderErrorView(req, res, "USER_DELETE_ERROR", 500);
  }
});

// Helper functions
const renderErrorView = (req, res, errorKey, statusCode, customMessage) => {
  const errorTitle = req.__("ERROR_TITLE") || "Error";
  const message = customMessage || req.__(errorKey) || "An error occurred.";
  return renderView(
    req,
    res,
    "error_message",
    errorTitle,
    { message },
    "",
    statusCode
  );
};

const validateUserData = (email, password) => {
  if (!password) throw new Error(req.__("ERROR_PASSWORD_REQUIRED"));
  if (password.length < 6) throw new Error(req.__("ERROR_PASSWORD_LENGTH"));
};

const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

const validateEmailUniqueness = async (email, entity) => {
  if (email !== entity.email) {
    const existingUser = await User.findOne({ email });
    if (existingUser) throw new Error(req.__("ERROR_EMAIL_USED_BY_OTHER"));
  }
};

module.exports = router;

// Additional logic can be refactored to:
// - src/models/User.js
// - src/utils/userValidation.js
// - src/utils/passwordUtils.js
