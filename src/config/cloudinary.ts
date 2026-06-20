import { v2 as cloudinary } from "cloudinary";
import { env } from "./env";
import { logger } from "./logger";

export const cloudinaryEnabled = !!env.CLOUDINARY_URL;

if (cloudinaryEnabled) {
  cloudinary.config(); // reads CLOUDINARY_URL from the environment
  logger.debug("Cloudinary configured");
} else {
  logger.warn("CLOUDINARY_URL not set — resume files will be parsed but not stored");
}

export { cloudinary };
