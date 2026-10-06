import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase } from "../lib/supabase";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    const artist = String(req.query.artist || "").trim();

    if (!artist) {
      return res.status(400).json({
        success: false,
        message: "Artist is required",
        data: []
      });
    }

    const { data, error } = await supabase
      .from("songs")
      .select("*")
      .ilike("artist", `%${artist}%`)
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
        data: []
      });
    }

    return res.status(200).json({
      success: true,
      artist,
      total: data?.length || 0,
      data: data || []
    });

  } catch {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      data: []
    });
  }
        }
