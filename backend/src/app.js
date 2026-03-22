const express = require("express");
const session = require("express-session");
const cors = require("cors");
const pdfRoutes = require("./routes/pdf.routes");
const authRoutes = require("./routes/auth.routes");
const medicineRoutes = require("./routes/medicine.routes");
const billRoutes = require("./routes/bill.routes");
const analyticsRoutes = require("./routes/analytics.routes");
const patientRoutes = require("./routes/patient.routes");
const exportRoutes = require("./routes/export.routes");
const { requireAuth } = require("./middleware/auth.middleware");

const app = express();
app.set('trust proxy', 1);

const FRONTEND_ORIGIN =
  process.env.FRONTEND_ORIGIN ||
  process.env.CLIENT_ORIGIN ||
  // Render frontend + local dev fallback
  "https://anubhav-billing.onrender.com,http://localhost:5173,http://127.0.0.1:5173";
const sessionSecret =
  process.env.SESSION_SECRET || "adarsh-billing-secret-key-2026";
const isProd = process.env.NODE_ENV === "production";

const allowlist = FRONTEND_ORIGIN.split(",").map((o) => o.trim());
app.use(
  cors({
    origin(origin, cb) {
      // Allow same-origin or tools like curl (no Origin header)
      if (!origin) return cb(null, true);
      const allowed = allowlist.includes(origin);
      if (allowed) return cb(null, true);
      console.warn("CORS blocked for origin:", origin);
      return cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);

// Log the allowed origins at startup for easy debugging.
console.log("CORS allowlist:", allowlist);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    name: "adarsh.sid",
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: isProd ? "none" : "lax",
      secure: isProd,
    },
  }),
);

app.use("/auth", authRoutes);

app.use("/api/medicines", medicineRoutes);
app.use("/api/bills", requireAuth, billRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/export", exportRoutes);
app.use("/api", requireAuth, pdfRoutes);

// Friendly root response so direct hits don't show a 404.
app.get("/", (_req, res) => {
  res.json({ ok: true, service: "Anubhav Billing API" });
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

module.exports = app;
