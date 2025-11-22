const TaskTemplate = require("./task-template.model");
const { renderView, renderErrorView } = require("../../utils/view-renderer");

/**
 * GET: Display task templates page
 */
exports.showTemplatesPage = async (req, res) => {
  const title = req.__("TASK_TEMPLATES_PAGE_TITLE") || "Task Templates";

  try {
    const templates = await TaskTemplate.find({})
      .sort({ templateName: 1 })
      .lean();

    renderView(
      req,
      res,
      "task_templates",
      title,
      {
        templates,
      },
      '<link rel="stylesheet" href="/css/table.css">'
    );
  } catch (error) {
    req.logger.error("Error while fetching task templates:", error);
    return renderErrorView(
      req,
      res,
      "TASK_TEMPLATES_LOAD_ERROR",
      500,
      error.message
    );
  }
};

/**
 * POST: Create a new task template
 */
exports.createTemplate = async (req, res) => {
  const {
    templateName,
    taskName,
    taskPriority,
    taskDescription,
    defaultDuration,
  } = req.body;

  const createdBy = req.user.username || "Admin";
  const modifiedBy = createdBy;

  if (!templateName || !taskName) {
    return res.status(400).json({
      msg:
        req.__("TEMPLATE_NAME_REQUIRED") ||
        "Template name and task name are required.",
    });
  }

  try {
    const newTemplate = new TaskTemplate({
      templateName,
      taskName,
      taskDescription: taskDescription || "",
      taskPriority,
      defaultDuration: defaultDuration ? parseInt(defaultDuration) : undefined,
      createdBy,
      modifiedBy,
    });

    const savedTemplate = await newTemplate.save();

    res.status(201).json({
      msg:
        req.__("TEMPLATE_CREATED_SUCCESS") || "Template created successfully.",
      template: savedTemplate,
    });
  } catch (err) {
    req.logger.error("Error creating task template:", err.message);
    if (err.name === "ValidationError") {
      return res.status(400).json({
        msg: `Validierungsfehler: ${Object.values(err.errors)
          .map((e) => e.message)
          .join(", ")}`,
      });
    }
    res.status(500).json({
      msg:
        req.__("TEMPLATE_CREATE_ERROR") ||
        "Server error while creating template.",
    });
  }
};

/**
 * PUT: Update an existing task template
 */
exports.updateTemplate = async (req, res) => {
  const templateId = req.params.id;
  const {
    templateName,
    taskName,
    taskPriority,
    taskDescription,
    defaultDuration,
  } = req.body;

  const modifiedBy = req.user.username || "Admin";

  if (!templateName || !taskName) {
    return res.status(400).json({
      msg:
        req.__("TEMPLATE_NAME_REQUIRED") ||
        "Template name and task name are required.",
    });
  }

  try {
    const updateFields = {
      templateName,
      taskName,
      taskDescription,
      taskPriority,
      defaultDuration: defaultDuration ? parseInt(defaultDuration) : undefined,
      modifiedBy,
      modifiedAt: new Date(),
    };

    const updatedTemplate = await TaskTemplate.findByIdAndUpdate(
      templateId,
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    if (!updatedTemplate) {
      return res.status(404).json({
        msg: req.__("TEMPLATE_NOT_FOUND") || "Template not found.",
      });
    }

    res.status(200).json({
      msg:
        req.__("TEMPLATE_UPDATED_SUCCESS") || "Template updated successfully.",
      template: updatedTemplate,
    });
  } catch (err) {
    req.logger.error("Error updating task template:", err.message);
    if (err.name === "ValidationError") {
      return res.status(400).json({
        msg: `Validierungsfehler: ${Object.values(err.errors)
          .map((e) => e.message)
          .join(", ")}`,
      });
    }
    res.status(500).json({
      msg:
        req.__("TEMPLATE_UPDATE_ERROR") ||
        "Server error while updating template.",
    });
  }
};

/**
 * DELETE: Delete a task template
 */
exports.deleteTemplate = async (req, res) => {
  const templateId = req.params.id;

  try {
    const deletedTemplate = await TaskTemplate.findByIdAndDelete(templateId);

    if (!deletedTemplate) {
      return res.status(404).json({
        msg: req.__("TEMPLATE_NOT_FOUND") || "Template not found.",
      });
    }

    res.status(204).send();
  } catch (err) {
    req.logger.error("Error deleting task template:", err.message);
    if (err.kind === "ObjectId") {
      return res.status(400).json({
        msg: req.__("INVALID_TEMPLATE_ID") || "Invalid template ID format.",
      });
    }
    res.status(500).json({
      msg:
        req.__("TEMPLATE_DELETE_ERROR") ||
        "Server error while deleting template.",
    });
  }
};

/**
 * GET: Get all templates (API endpoint)
 */
exports.getAllTemplates = async (req, res) => {
  try {
    const templates = await TaskTemplate.find({})
      .sort({ templateName: 1 })
      .lean();

    res.status(200).json({
      ok: true,
      templates,
    });
  } catch (err) {
    req.logger.error("Error fetching task templates:", err.message);
    res.status(500).json({
      ok: false,
      msg: req.__("TEMPLATE_LOAD_ERROR") || "Error loading templates.",
    });
  }
};

/**
 * GET: Get a single template by ID (API endpoint)
 */
exports.getTemplateById = async (req, res) => {
  const templateId = req.params.id;

  try {
    const template = await TaskTemplate.findById(templateId).lean();

    if (!template) {
      return res.status(404).json({
        ok: false,
        msg: req.__("TEMPLATE_NOT_FOUND") || "Template not found.",
      });
    }

    res.status(200).json({
      ok: true,
      template,
    });
  } catch (err) {
    req.logger.error("Error fetching task template:", err.message);
    if (err.kind === "ObjectId") {
      return res.status(400).json({
        ok: false,
        msg: req.__("INVALID_TEMPLATE_ID") || "Invalid template ID format.",
      });
    }
    res.status(500).json({
      ok: false,
      msg: req.__("TEMPLATE_LOAD_ERROR") || "Error loading template.",
    });
  }
};
