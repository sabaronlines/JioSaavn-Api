import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase } from "../lib/supabase";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    const query = String(req.query.query || "").trim();

    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Query is required",
        data: []
      });
    }

    const { data, error } = await supabase
      .from("songs")
      .select("*")
      .or(
        `title.ilike.%${query}%,artist.ilike.%${query}%,album.ilike.%${query}%`
      )
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
        data: []
      });
    }

    return res.status(200).json({
      success: true,
      query,
      total: data?.length || 0,
      data: data || []
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      data: []
    });
  }
}
