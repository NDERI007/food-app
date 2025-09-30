import app from "./app";

const PORT = parseInt(process.env.PORT || "8787", 10);

app.listen(PORT, () => {
  console.log(`🚀 Autocomplete API running on http://localhost:${PORT}`);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});
