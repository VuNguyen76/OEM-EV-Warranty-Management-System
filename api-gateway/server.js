// server.js
import { App } from "./src/App.js";
import dotenv from "dotenv";
dotenv.config(path.resolve(__dirname, "./.env"));
const SECRET = process.env.JWT_SECRET; // đưa vào .env
const gateway = new App(SECRET);
gateway.start(3000);
