"use client";

import { useState } from "react";

export default function ViewNFTPage() {
  const [txHash, setTxHash] = useState("");
  const [metadata, setMetadata] = useState<any>(null);
  const [image, setImage] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchNFTMetadata = async () => {
    try {
      setLoading(true);
      setError("");
      setMetadata(null);
      setImage("");

      // Call our secure server-side API (keeps Blockfrost key private)
      const response = await fetch(`/api/nft/metadata/${txHash}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch metadata');
      }

      const data = await response.json();
      const json = data.metadata;

      console.log("NFT Metadata:", json);
      setMetadata(data.raw);

      // Navigate through the metadata structure to find the image
      // Structure: { policyId: { assetName: { image: [...], files: [...] } } }
      const policyIds = Object.keys(json);
      let foundImage = false;

      for (const policyId of policyIds) {
        const assets = json[policyId];
        const assetNames = Object.keys(assets);

        for (const assetName of assetNames) {
          const assetData = assets[assetName];
          console.log("Asset data:", assetData);

          // Try to reconstruct image from chunks
          let imageData = null;

          // Check if image is an array (chunked)
          if (Array.isArray(assetData.image)) {
            imageData = assetData.image.join('');
            console.log("Found chunked image in 'image' field");
          }
          // Check files array
          else if (assetData.files && Array.isArray(assetData.files)) {
            const imageFile = assetData.files.find((f: any) =>
              f.mediaType?.includes('image')
            );

            if (imageFile && Array.isArray(imageFile.src)) {
              imageData = imageFile.src.join('');
              console.log("Found chunked image in 'files.src' field");
            }
          }
          // Check if it's a data URI
          else if (typeof assetData.image === 'string' && assetData.image.startsWith('data:')) {
            imageData = assetData.image.split(',')[1]; // Extract base64 part
            console.log("Found data URI image");
          }

          if (imageData) {
            // Remove data URI prefix if present
            if (imageData.startsWith('data:')) {
              imageData = imageData.split(',')[1];
            }

            // Create data URI
            const dataUri = `data:image/png;base64,${imageData}`;
            setImage(dataUri);
            foundImage = true;
            console.log("Image reconstructed, length:", imageData.length);
            break;
          }
        }

        if (foundImage) break;
      }

      if (!foundImage) {
        setError("Could not find or reconstruct image from metadata");
      }
    } catch (err: any) {
      console.error("Error fetching NFT:", err);
      setError(err.message || "Failed to fetch NFT metadata");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">
          NFT Metadata Viewer
        </h1>

        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <label className="block text-sm font-medium mb-2">
            Transaction Hash
          </label>
          <input
            type="text"
            value={txHash}
            onChange={(e) => setTxHash(e.target.value)}
            placeholder="Enter transaction hash (e.g., 8827b357bc3090fd...)"
            className="w-full px-4 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none mb-4"
          />

          <button
            onClick={fetchNFTMetadata}
            disabled={loading || !txHash}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-6 py-3 rounded font-semibold transition-colors"
          >
            {loading ? "Loading..." : "View NFT"}
          </button>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-600 rounded-lg p-4 mb-6">
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {image && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-2xl font-bold mb-4">NFT Image</h2>
            <div className="flex justify-center">
              <img
                src={image}
                alt="NFT"
                className="max-w-full h-auto rounded border-2 border-gray-600"
                style={{ imageRendering: 'pixelated' }}
              />
            </div>
          </div>
        )}

        {metadata && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Raw Metadata</h2>
            <pre className="bg-gray-900 p-4 rounded overflow-auto max-h-96 text-xs">
              {JSON.stringify(metadata, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
