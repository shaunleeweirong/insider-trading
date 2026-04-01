import { z } from "zod";

export const senateTradeSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  office: z.string(),
  transactionDate: z.string(),
  ticker: z.string().nullable().optional(),
  assetDescription: z.string(),
  assetType: z.string().nullable().optional(),
  type: z.string(),
  amount: z.string(),
  comment: z.string().nullable().optional(),
  link: z.string().nullable().optional(),
});

export const houseDisclosureSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  office: z.string(),
  transactionDate: z.string(),
  ticker: z.string().nullable().optional(),
  assetDescription: z.string(),
  assetType: z.string().nullable().optional(),
  type: z.string(),
  amount: z.string(),
  comment: z.string().nullable().optional(),
  link: z.string().nullable().optional(),
});

export const stockQuoteSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  price: z.number(),
  change: z.number(),
  changesPercentage: z.number(),
});

export const historicalPriceSchema = z.object({
  date: z.string(),
  close: z.number(),
  high: z.number(),
  low: z.number(),
  open: z.number(),
  volume: z.number(),
});

export type SenateTrade = z.infer<typeof senateTradeSchema>;
export type HouseDisclosure = z.infer<typeof houseDisclosureSchema>;
export type StockQuote = z.infer<typeof stockQuoteSchema>;
export type HistoricalPrice = z.infer<typeof historicalPriceSchema>;
