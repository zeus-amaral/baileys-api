import baileys from "@/baileys";
import { adminGuard } from "@/middleware/auth";
import Elysia from "elysia";

const adminController = new Elysia({
  prefix: "/admin",
  detail: {
    tags: ["Admin"],
    security: [{ xApiKey: [] }],
  },
})
  .use(adminGuard)
  .post("/connections/logout-all", async () => await baileys.logoutAll());

// biome-ignore lint/style/noDefaultExport: <explanation>
export default adminController;
