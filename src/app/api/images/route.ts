import { getCloudflareContext } from "@opennextjs/cloudflare"

export const runtime = "edge"

export async function GET() {
  try {
    const { env } = getCloudflareContext()
    const imagesKV = env.IMAGES_KV

    if (!imagesKV) {
      return new Response("Images KV not configured", { status: 500 })
    }

    // List all keys with the "image:" prefix
    const keys = await imagesKV.list({ prefix: "image:" })

    // Get all image metadata
    const images = await Promise.all(
      keys.keys.map(async (key) => {
        const data = await imagesKV.get(key.name)
        return data ? JSON.parse(data) : null
      }),
    )

    // Filter out any null values and sort by uploadedAt (newest first)
    const validImages = images
      .filter(Boolean)
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())

    return Response.json(validImages)
  } catch (error) {
    console.error("Error fetching images:", error)
    return new Response(`Failed to fetch images: ${error instanceof Error ? error.message : "Unknown error"}`, {
      status: 500,
    })
  }
}

