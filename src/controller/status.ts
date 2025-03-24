import { authMiddleware } from "@/middleware/auth";
import Elysia from "elysia";

const statusController = new Elysia({
  detail: {
    tags: ["Status"],
    security: [{ xApiKey: [] }],
  },
})
  // TODO: Use auth data to limit access to existing connections.
  .use(authMiddleware)
  .get("/status", () => ({}), {
    detail: {
      responses: {
        200: {
          description: "Server running",
        },
      },
    },
  });

// biome-ignore lint/style/noDefaultExport: <explanation>
export default statusController;
