import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(req: VercelRequest, res: VercelResponse) {
  const query = (req.query.query as string) || "";

  res.status(200).json({
    success: true,
    query,
    data: []
  });
}
