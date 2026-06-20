import { Router } from "express";
import { requireAuth } from "@/middleware/require-auth";
import { validate } from "@/middleware/validate";
import * as c from "./controller";
import {
  briefSchema,
  chatSchema,
  coverSchema,
  createSessionSchema,
  modelSchema,
  patchSessionSchema,
  templateSchema,
} from "./schema";

export const sessionsRouter = Router();
sessionsRouter.use(requireAuth);

sessionsRouter.get("/", c.list);
sessionsRouter.post("/", validate({ body: createSessionSchema }), c.create);
sessionsRouter.get("/:id", c.get);
sessionsRouter.patch("/:id", validate({ body: patchSessionSchema }), c.patch);
sessionsRouter.delete("/:id", c.remove);
sessionsRouter.put("/:id/model", validate({ body: modelSchema }), c.setModel);
sessionsRouter.put(
  "/:id/template",
  validate({ body: templateSchema }),
  c.setTemplate,
);

sessionsRouter.post("/:id/tailor", c.tailor);
sessionsRouter.post(
  "/:id/cover-letter",
  validate({ body: coverSchema }),
  c.cover,
);
sessionsRouter.post("/:id/chat", validate({ body: chatSchema }), c.chat);
sessionsRouter.post(
  "/:id/interview-brief",
  validate({ body: briefSchema }),
  c.brief,
);
