import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase } from "../lib/supabase";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    const album = String(req.query.album || "").trim();

    if (!album) {
      return res.status(400).json({
        success: false,
        message: "Album is required",
        data: []
      });
    }

    const { data, error } = await supabase
      .from("songs")
      .select("*")
      .ilike("album", `%${album}%`)
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
      album,
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
