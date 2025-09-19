import React from "react";
import { FileText } from "lucide-react";

interface FileDisplayProps {
  files: Array<{
    name?: string;
    url?: string;
    type?: string;
    [key: string]: unknown; // Allow additional properties
  }>;
  title?: string;
}

const FileDisplay: React.FC<FileDisplayProps> = ({
  files,
  title = "Attachments",
}) => {
  if (!files || files.length === 0) {
    return null;
  }

  const openImageInNewTab = (file: {
    name?: string;
    url?: string;
    type?: string;
    [key: string]: unknown;
  }) => {
    const newWindow = window.open();
    if (newWindow) {
      newWindow.document.write(`
        <html>
          <head>
            <title>${file.name || "Image"}</title>
            <style>
              body { 
                margin: 0;
                padding: 0;
                background: #f5f5f5;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
              }
              img {
                width: 100%;
                height: 100vh;
                object-fit: contain;
                border-radius: 0;
                box-shadow: none;
              }
              .close-btn { 
                position: fixed; 
                top: 20px; 
                right: 20px; 
                background: rgba(0, 0, 0, 0.7); 
                color: white; 
                border: none; 
                padding: 10px 15px; 
                border-radius: 5px; 
                cursor: pointer; 
              }
            </style>
          </head>
          <body>
            <button class="close-btn" onclick="window.close()">Close</button>
            <img src="${file.url}" alt="${file.name || "Image"}" />
          </body>
        </html>
      `);
    }
  };

  const isImageFile = (file: {
    name?: string;
    url?: string;
    type?: string;
    [key: string]: unknown;
  }) => {
    if (!file.url) return false;
    return (
      file.url.startsWith("data:image/") ||
      (file.url.startsWith("http") &&
        (file.url.includes(".jpg") ||
          file.url.includes(".jpeg") ||
          file.url.includes(".png") ||
          file.url.includes(".gif") ||
          file.url.includes(".webp") ||
          file.url.includes(".svg")))
    );
  };

  return (
    <div className="mt-3">
      <span className="text-sm font-medium text-gray-700">{title}:</span>
      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {files.map((file, fileIndex) => (
          <div
            key={fileIndex}
            className="border border-gray-200 rounded-lg overflow-hidden"
          >
            {isImageFile(file) ? (
              <img
                src={file.url}
                alt={file.name || `Attachment ${fileIndex + 1}`}
                className="w-full h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                onError={(e) => {
                  console.error("Failed to load image:", file.url);
                  e.currentTarget.style.display = "none";
                  e.currentTarget.nextElementSibling?.classList.remove(
                    "hidden",
                  );
                }}
                onClick={() => openImageInNewTab(file)}
              />
            ) : null}
            <div
              className={`p-4 text-center ${isImageFile(file) ? "hidden" : ""}`}
            >
              <FileText className="w-8 h-8 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-600">
                {file.name || "Unknown file"}
              </p>
              {file.url && (
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800 mt-1 inline-block"
                >
                  Download
                </a>
              )}
            </div>
            {file.name && (
              <div className="p-2 bg-gray-50 border-t border-gray-200">
                <p className="text-xs text-gray-600 truncate" title={file.name}>
                  {file.name}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FileDisplay;
