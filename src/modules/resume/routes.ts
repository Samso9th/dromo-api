import { Router } from "express";
import multer from "multer";
import { requireAuth } from "@/middleware/require-auth";
import { validate } from "@/middleware/validate";
import { asyncHandler, badRequest } from "@/utils/app-error";
import { reqUser } from "@/utils/req-user";
import { MasterResume } from "@/models";
import { masterResumeSchema } from "@/validators/resume";
import { uploadAndParseMaster } from "@/services/parse.service";

export const resumeRouter = Router();
resumeRouter.use(requireAuth);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// POST /resume/master → upload a PDF/DOCX, AI-parse it into the master resume JSON
resumeRouter.post(
  "/master",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw badRequest("No file uploaded (field name: 'file')");
    const data = await uploadAndParseMaster(reqUser(req), {
      buffer: req.file.buffer,
      mimetype: req.file.mimetype,
      originalname: req.file.originalname,
    });
    res.json(data);
  }),
);

// GET /resume/master → the user's master resume JSON (or null)
resumeRouter.get(
  "/master",
  asyncHandler(async (req, res) => {
    const master = await MasterResume.findOne({ where: { userId: reqUser(req).id } });
    res.json(master?.data ?? null);
  }),
);

// PUT /resume/master → replace the structured master resume
resumeRouter.put(
  "/master",
  validate({ body: masterResumeSchema }),
  asyncHandler(async (req, res) => {
    const userId = reqUser(req).id;
    const existing = await MasterResume.findOne({ where: { userId } });
    if (existing) {
      existing.data = req.body;
      existing.parsedAt = existing.parsedAt ?? new Date();
      await existing.save();
    } else {
      await MasterResume.create({ userId, data: req.body, parsedAt: new Date() });
    }
    res.json(req.body);
  }),
);

// POST /resume/master (multipart upload → Cloudinary → AI parse) is added with the files/parse work.
