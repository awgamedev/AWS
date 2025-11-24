// userCert.controller.js
// Controller for generating and returning a .p12 certificate for a user (admin only)
const User = require("./user.model");
const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

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
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=\"${p12File}\"`
      );
      res.setHeader("Content-Type", "application/x-pkcs12");
      res.setHeader("X-P12-Password", exportPassword);
      const stream = fs.createReadStream(p12Path);
      stream.pipe(res);
      stream.on("close", () => {
        // Cleanup: remove entire temp directory asynchronously
        fs.rm(outDir, { recursive: true, force: true }, () => {});
      });
    });
  } catch (err) {
    req.logger && req.logger.error("Error generating user certificate:", err);
    res
      .status(500)
      .json({ ok: false, msg: "Server error", error: err.message });
  }
};
