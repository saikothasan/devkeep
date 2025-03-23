"use client"

import type React from "react"

import { useState } from "react"
import { Upload, ImagePlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"

export function UploadForm() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const { toast } = useToast()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select an image to upload",
        variant: "destructive",
      })
      return
    }

    // Check if file is an image
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (JPEG, PNG, etc.)",
        variant: "destructive",
      })
      return
    }

    setUploading(true)
    setProgress(0)

    // Create form data
    const formData = new FormData()
    formData.append("image", file)

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          const newProgress = Math.min(prev + 10, 90)
          return newProgress
        })
      }, 300)

      // Upload the file
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      clearInterval(progressInterval)

      if (!response.ok) {
        const error = await response.text()
        throw new Error(error || "Failed to upload image")
      }

      setProgress(100)

      const data = await response.json()

      toast({
        title: "Upload successful",
        description: "Your image has been uploaded successfully",
      })

      // Reset form after successful upload
      setFile(null)
      setTimeout(() => {
        setUploading(false)
        setProgress(0)
        // Refresh the page to show the new image
        window.location.reload()
      }, 1000)
    } catch (error) {
      console.error("Upload error:", error)
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      })
      setUploading(false)
      setProgress(0)
    }
  }

  return (
    <div className="p-6 border rounded-lg shadow-sm">
      <h2 className="text-xl font-semibold mb-4">Upload an Image</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center">
          <div className="mb-4">
            <ImagePlus className="h-10 w-10 text-gray-400" />
          </div>
          <p className="text-sm text-gray-500 mb-2">Drag and drop your image here, or click to browse</p>
          <input
            type="file"
            id="file-upload"
            className="hidden"
            onChange={handleFileChange}
            accept="image/*"
            disabled={uploading}
          />
          <label htmlFor="file-upload" className="cursor-pointer text-sm text-primary hover:text-primary/80">
            Select an image
          </label>
          {file && (
            <div className="mt-4 text-sm">
              <p className="font-medium">{file.name}</p>
              <p className="text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
            </div>
          )}
        </div>

        {uploading && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-gray-500 text-center">{progress}% uploaded</p>
          </div>
        )}

        <Button type="submit" className="w-full" disabled={!file || uploading}>
          <Upload className="h-4 w-4 mr-2" />
          {uploading ? "Uploading..." : "Upload Image"}
        </Button>
      </form>
    </div>
  )
}

