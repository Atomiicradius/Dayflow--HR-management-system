import { z } from "zod";

export const updateProfileSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^[+\d][\d\s-]{6,14}$/, "Enter a valid phone number")
    .optional()
    .or(z.literal("")),
  address: z.string().trim().max(500, "Keep the address under 500 characters").optional().or(z.literal("")),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
