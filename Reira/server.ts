import dotenv from "dotenv";
dotenv.config();
console.log("SUPABASE_URL =", process.env.SUPABASE_URL);
console.log(
  "SUPABASE_ANON_KEY =",
  process.env.SUPABASE_ANON_KEY?.slice(0, 6) + "..."
);

import app from "./app";

const PORT = parseInt(process.env.PORT || "8787", 10);

app.listen(PORT, () => {
  console.log(`🚀 Autocomplete API running on http://localhost:${PORT}`);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});
