import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase } from "../lib/supabase";

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;

function escapeSearch(value: string): string {
  // Prevent %, _, and backslash from becoming LIKE wildcards
  return value
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
    .trim();
}

function setCors(res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  setCors(res);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  // Only GET is allowed
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

    // Prevent unnecessarily huge database searches
    const query = escapeSearch(rawQuery).slice(0, 100);

    const page = Math.max(
      1,
      Number.parseInt(String(req.query.page || "1"), 10) || 1
    );

    const requestedLimit =
      Number.parseInt(String(req.query.limit || DEFAULT_LIMIT), 10) ||
      DEFAULT_LIMIT;

    const limit = Math.min(Math.max(requestedLimit, 1), MAX_LIMIT);

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    /*
     * Search:
     * - title
     * - artist
     * - album
     *
     * Trigram indexes recommended below will make these ILIKE searches
     * significantly faster on larger tables.
     */
    const { data, error, count } = await supabase
      .from("songs")
      .select(
        `
        id,
        title,
        artist,
        album,
        image,
        url,
        duration,
        created_at
        `,
        { count: "exact" }
      )
      .or(
        `title.ilike.%${query}%,artist.ilike.%${query}%,album.ilike.%${query}%`
      )
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("Supabase search error:", error);

      return res.status(500).json({
        success: false,
        message: "Database search failed",
        data: [],
      });
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    // Cache public search responses briefly
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
  } catch (error) {
    console.error("Search API error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      data: [],
    });
  }
}
