import { prisma } from "./config/database";
import { env } from "./config/env";
import { app } from "./app";

const server = app.listen(env.port, () => {
  console.log(`SupportDesk API is running at http://localhost:${env.port}`);
});

function closeServer(): void {
  server.close(() => {
    void prisma.$disconnect();
  });
}

process.on("SIGINT", closeServer);
process.on("SIGTERM", closeServer);
