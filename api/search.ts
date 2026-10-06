import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase } from "../lib/supabase";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

function escapeSearch(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
    .trim();
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
      data: [],
    });
  }

  try {
    const rawQuery = String(req.query.query || "").trim();

    if (!rawQuery) {
      return res.status(400).json({
        success: false,
        message: "Query is required",
        data: [],
      });
    }

    const query = escapeSearch(rawQuery).slice(0, 100);

    const page = Math.max(
      1,
      parseInt(String(req.query.page || "1"), 10) || 1
    );

    const requestedLimit =
      parseInt(String(req.query.limit || DEFAULT_LIMIT), 10) ||
      DEFAULT_LIMIT;

    const limit = Math.min(
      Math.max(requestedLimit, 1),
      MAX_LIMIT
    );

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await supabase
      .from("songs")
      .select("*", { count: "exact" })
      .or(
        `title.ilike.%${query}%,artist.ilike.%${query}%,album.ilike.%${query}%`
      )
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("SUPABASE SEARCH ERROR:", error);

      return res.status(500).json({
        success: false,
        message: error.message,
        error: {
          code: error.code,
          details: error.details,
          hint: error.hint,
        },
        data: [],
      });
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    res.setHeader(
      "Cache-Control",
      "public, s-maxage=30, stale-while-revalidate=60"
    );

    return res.status(200).json({
      success: true,
      query: rawQuery,
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
      data: data || [],
    });
  } catch (error: any) {
    console.error("SEARCH API ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error?.message || "Internal server error",
      data: [],
    });
  }
}
