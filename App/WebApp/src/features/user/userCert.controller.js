// userCert.controller.js
// Controller for generating and returning a .p12 certificate for a user (admin only)
const User = require("./user.model");
const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { renderView, renderErrorView } = require("../../utils/view-renderer");

// Helper: Generate a random password for the .p12 export
function randomPassword(length = 16) {
  return [...Array(length)]
    .map(() => Math.floor(Math.random() * 36).toString(36))
    .join("");
}

exports.createUserCert = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);
    if (!user)
      return res.status(404).json({ ok: false, msg: "User not found" });

    // Use username and email for CN and emailAddress
    const CN = user.username;
    const EMAIL = user.email;
    const OU = user.role || "user";
    const exportPassword = randomPassword(16); // Password for .p12 import
    // Use a unique temporary output directory to avoid collisions and simplify file discovery
    const tmpDirBase = path.join(os.tmpdir(), "usercert-");
    const outDir = fs.mkdtempSync(tmpDirBase); // e.g. /tmp/usercert-abc123
    const scriptPath = path.resolve(
      __dirname,
      "../../../scripts/create-client.sh"
    );

    // Call the shell script to generate the cert (reuse your script)
    const args = [
      scriptPath,
      "-n",
      CN,
      "-e",
      EMAIL,
      "-r",
      OU,
      "-O",
      outDir,
      "-k", // keep key/crt for potential auditing
    ];
    // Set CA_PASSWORD in env if needed
    const env = {
      ...process.env,
      CA_PASSWORD: process.env.CA_PASSWORD || "MySecureCAPassword123!",
      PKCS12_EXPORT_PASSWORD: exportPassword,
    };

    const child = spawn("/bin/bash", args, { env });
    let stderr = "";
    let stdout = "";
    child.stdout.on("data", (d) => {
      stdout += d.toString();
    });
    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });
    child.on("close", (code) => {
      if (code !== 0) {
        req.logger && req.logger.error("[CertGen] Script failed:", stderr);
        return res.status(500).json({
          ok: false,
          msg: "Certificate generation failed",
          error: stderr || "Unknown error from script. Check server logs.",
          output: stdout.split(/\n/).slice(-15),
        });
      }
      // Find the single .p12 file in the dedicated outDir
      const files = fs.readdirSync(outDir);
      const p12File = files.find((f) => f.endsWith(".p12"));
      if (!p12File) {
        req.logger &&
          req.logger.error("[CertGen] .p12 file not found. Files:", files);
        return res
          .status(500)
          .json({ ok: false, msg: "Certificate file not found", files });
      }
      const p12Path = path.join(outDir, p12File);
      // Use a clean, user-friendly filename for download
      const cleanFilename = `${user.username}_certificate.p12`;

      // Store certificate info in session for the info page
      req.session.certificateInfo = {
        userId: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role,
        password: exportPassword,
        filename: cleanFilename,
        p12Path: p12Path,
        outDir: outDir,
        createdAt: new Date(),
        certificateDetails: {
          CN: CN,
          EMAIL: EMAIL,
          OU: OU,
          O: "DevLab",
          C: "DE",
        },
      };

      // Redirect to certificate info page
      res.json({ ok: true, redirect: `user/${userId}/certificate-info` });
    });
  } catch (err) {
    req.logger && req.logger.error("Error generating user certificate:", err);
    res
      .status(500)
      .json({ ok: false, msg: "Server error", error: err.message });
  }
};

exports.showCertificateInfo = async (req, res) => {
  try {
    const userId = req.params.id;
    const certInfo = req.session.certificateInfo;

    // Check if certificate info exists and matches the user
    if (!certInfo || certInfo.userId !== userId) {
      return renderView(
        req,
        res,
        "error_message",
        req.__("ERROR_TITLE") || "Fehler",
        {
          message:
            "Keine Zertifikatsinformationen gefunden. Bitte erstellen Sie ein neues Zertifikat.",
        },
        "",
        404
      );
    }

    const user = await User.findById(userId);
    if (!user) {
      return renderView(
        req,
        res,
        "error_message",
        req.__("ERROR_TITLE") || "Fehler",
        {
          message: "Benutzer nicht gefunden.",
        },
        "",
        404
      );
    }

    const title =
      req.__("CERTIFICATE_INFO_TITLE") || "Zertifikatsinformationen";
    renderView(req, res, "certificate_info", title, {
      certInfo: certInfo,
      user: user,
      userRole: req.user.role,
    });
  } catch (err) {
    req.logger && req.logger.error("Error displaying certificate info:", err);
    return renderView(
      req,
      res,
      "error_message",
      req.__("ERROR_TITLE") || "Fehler",
      {
        message: "Serverfehler beim Anzeigen der Zertifikatsinformationen.",
      },
      "",
      500
    );
  }
};

exports.downloadCertificate = async (req, res) => {
  try {
    const userId = req.params.id;
    const certInfo = req.session.certificateInfo;

    // Check if certificate info exists and matches the user
    if (!certInfo || certInfo.userId !== userId) {
      return res.status(404).json({
        ok: false,
        msg: "Keine Zertifikatsinformationen gefunden.",
      });
    }

    // Check if file still exists
    if (!fs.existsSync(certInfo.p12Path)) {
      return res.status(404).json({
        ok: false,
        msg: "Zertifikatsdatei nicht mehr verfügbar.",
      });
    }

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=\"${certInfo.filename}\"`
    );
    res.setHeader("Content-Type", "application/x-pkcs12");
    const stream = fs.createReadStream(certInfo.p12Path);
    stream.pipe(res);
    stream.on("close", () => {
      // Cleanup: remove entire temp directory asynchronously
      fs.rm(certInfo.outDir, { recursive: true, force: true }, () => {});
      // Clear session data after download
      delete req.session.certificateInfo;
    });
  } catch (err) {
    req.logger && req.logger.error("Error downloading certificate:", err);
    res.status(500).json({ ok: false, msg: "Serverfehler" });
  }
};
