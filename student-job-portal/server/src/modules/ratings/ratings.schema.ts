import { z } from 'zod';

export const rateSchema = z.object({
  rating: z.number().int('Choose 1 to 5 stars').min(1, 'Choose 1 to 5 stars').max(5, 'Choose 1 to 5 stars'),
});