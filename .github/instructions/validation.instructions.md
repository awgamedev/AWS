# Validation Instructions for any entity

This is an example of how to implement validation for an entity in your application. The validation logic should be placed in a separate file to keep the code organized and maintainable.

```javascript
router.post("/modify-entity", ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    const { stampingType, stampingReason } = req.body;

    const validationErrors = await validateEntityData(req);

    // If there are validation errors, re-render the form with errors
    if (Object.keys(validationErrors).length > 0) {
      return res
        .status(400)
        .json({ msg: "Ungültige Stempeldaten.", errors: validationErrors });
    }
    // Procede with processing the valid data
    // ...
```

The file `entity.validator.js` should contain the validation logic.
This is an example of how to validate the `stampingType` and `stampingReason` fields:

```javascript
async function validateEntityData(req) {
  const errors = {};
  const { stampingType, stampingReason } = req.body;

  // Validate stampingType
  if (!stampingType || !["come", "go"].includes(stampingType)) {
    errors.stampingType = "Ungültiger Stempeltyp.";
  }

  // Validate stampingReason
  const ALLOWED_REASONS = ["Kühe melken", "Feldarbeit", "Büroarbeit"];
  if (stampingReason && !ALLOWED_REASONS.includes(stampingReason)) {
    errors.stampingReason = "Ungültiger Stempelgrund.";
  }

  return errors;
}
```
