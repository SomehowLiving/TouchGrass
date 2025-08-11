"use client";

import { useState } from "react";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!file) return alert("Please select a file");
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/files", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setUrl(data.url);
        alert("Upload successful!");
      } else {
        console.error("Upload error:", data.error);
        alert("Upload failed!");
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert("Something went wrong");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-10 text-white">
      <h1 className="text-xl mb-4">Test IPFS Upload</h1>
      <input
        type="file"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />
      <button
        onClick={handleUpload}
        disabled={uploading}
        className="mt-4 px-4 py-2 bg-green-600 rounded hover:bg-green-700"
      >
        {uploading ? "Uploading..." : "Upload to IPFS"}
      </button>

      {url && (
        <p className="mt-4">
          File URL:{" "}
          <a href={url} className="text-blue-400 underline" target="_blank">
            {url}
          </a>
        </p>
      )}
    </div>
  );
}
