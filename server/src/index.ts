import express from "express";
import { WebSocketServer } from "ws";
import * as http from "http";
import { handleConnection } from "./socket";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.get("/", (_req, res) => {
  res.send("Dino Game Server running 🦖");
});

wss.on("connection", (ws) => {
  handleConnection(ws, wss);
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});