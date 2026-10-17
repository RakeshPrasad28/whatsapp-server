import express, { Application, Request, Response } from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes";
import chatRoutes from "./routes/chatRoutes";
import messageRoutes from "./routes/messageRoutes";
import { notFound, errorHandler } from "./middleware/errorMiddleware";

const app: Application = express();

// Middlewares
app.use(
  cors({
    origin: process.env.CLIENT_URL === "*" ? "*" : process.env.CLIENT_URL?.split(",") || "*",
    credentials: true,
  })
);
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// Health Check & Root route
app.get("/", (_req: Request, res: Response) => {
  res.json({
    status: "active",
    message: "WhatsApp Backend API is running successfully 🚀",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/messages", messageRoutes);

// Error Handling Middlewares
app.use(notFound);
app.use(errorHandler);

export default app;
