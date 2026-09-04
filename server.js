require("dotenv").config({ path: ".env.local" });
const path = require("path");
const express = require("express");
const app = require("./app");

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public"), { index: "index.html" }));

app.listen(PORT, () => console.log(`Servidor rodando: http://localhost:${PORT}`));
