import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase } from "../lib/supabase";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    const id = String(req.query.id || "").trim();

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Song ID is required"
      });
    }

    const { data, error } = await supabase
      .from("songs")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return res.status(404).json({
        success: false,
        message: "Song not found"
      });
    }

    return res.status(200).json({
      success: true,
      data
    });

  } catch {
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
}
