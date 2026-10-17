import jwt from "jsonwebtoken";
import { Types } from "mongoose";

export const generateToken = (id: Types.ObjectId | string): string => {
  const secret = process.env.JWT_SECRET || "default_jwt_secret";
  return jwt.sign({ id }, secret, {
    expiresIn: "30d",
  });
};
