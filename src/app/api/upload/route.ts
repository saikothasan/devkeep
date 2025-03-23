import { getCloudflareContext } from "@opennextjs/cloudflare"
import type { NextRequest } from "next/server"
import { v4 as uuidv4 } from "uuid"

// Hardcoded R2 public URL
const R2_PUBLIC_URL = "pub-39294b7d126d44b687cf528e9b2a308e.r2.dev"

export const runtime = "edge"

export async function POST(request: NextRequest) {
  try {
    console.log("Upload request received")

    // Get Cloudflare context to access R2 bucket
    const { env } = getCloudflareContext()
    const r2Bucket = env.IMAGE_BUCKET

    if (!r2Bucket) {
      console.error("R2 bucket not configured")
      return new Response("R2 bucket not configured", { status: 500 })
    }

    console.log("R2 bucket available")

    try {
      // Parse the multipart form data
      const formData = await request.formData()
      console.log("Form data parsed")

      const imageFile = formData.get("image") as File | null

      if (!imageFile) {
        console.error("No image file in form data")
        return new Response("No image file provided", { status: 400 })
      }

      console.log("Image file found:", imageFile.name, imageFile.type, imageFile.size)

      // Validate file type
      if (!imageFile.type.startsWith("image/")) {
        console.error("Invalid file type:", imageFile.type)
        return new Response("File must be an image", { status: 400 })
      }

      // Generate a unique ID for the image
      const imageId = uuidv4()
      console.log("Generated image ID:", imageId)

      // Create a safe filename
      const originalFilename = imageFile.name
      const fileExtension = originalFilename.split(".").pop() || "jpg"
      const safeFilename = `${imageId}.${fileExtension}`
      console.log("Safe filename:", safeFilename)

      try {
        // Convert file to ArrayBuffer
        const arrayBuffer = await imageFile.arrayBuffer()
        console.log("File converted to ArrayBuffer, size:", arrayBuffer.byteLength)

        try {
          // Upload to R2
          await r2Bucket.put(safeFilename, arrayBuffer, {
            httpMetadata: {
              contentType: imageFile.type,
            },
          })
          console.log("File uploaded to R2 successfully")

          // Get the public URL for the image using the hardcoded R2 URL
          const imageUrl = `https://${R2_PUBLIC_URL}/${safeFilename}`
          console.log("Image URL:", imageUrl)

          // Store metadata in KV
          const imageMetadata = {
            id: imageId,
            filename: originalFilename,
            url: imageUrl,
            size: imageFile.size,
            type: imageFile.type,
            uploadedAt: new Date().toISOString(),
          }

          try {
            if (env.IMAGES_KV) {
              await env.IMAGES_KV.put(`image:${imageId}`, JSON.stringify(imageMetadata))
              console.log("Metadata stored in KV")
            } else {
              console.error("IMAGES_KV not available")
            }

            // Return success response
            return Response.json({
              success: true,
              image: imageMetadata,
            })
          } catch (kvError) {
            console.error("Error storing metadata in KV:", kvError)
            // Still return success since the image was uploaded
            return Response.json({
              success: true,
              image: imageMetadata,
              warning: "Image uploaded but metadata storage failed",
            })
          }
        } catch (r2Error) {
          console.error("Error uploading to R2:", r2Error)
          return new Response(
            `Failed to upload to R2: ${r2Error instanceof Error ? r2Error.message : "Unknown R2 error"}`,
            {
              status: 500,
            },
          )
        }
      } catch (bufferError) {
        console.error("Error converting file to ArrayBuffer:", bufferError)
        return new Response(
          `Failed to process image: ${bufferError instanceof Error ? bufferError.message : "Unknown buffer error"}`,
          {
            status: 500,
          },
        )
      }
    } catch (formDataError) {
      console.error("Error parsing form data:", formDataError)
      return new Response(
        `Failed to parse form data: ${formDataError instanceof Error ? formDataError.message : "Unknown form data error"}`,
        {
          status: 500,
        },
      )
    }
  } catch (error) {
    console.error("Upload error:", error)
    return new Response(`Failed to upload image: ${error instanceof Error ? error.message : "Unknown error"}`, {
      status: 500,
    })
  }
}

