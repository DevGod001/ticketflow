import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Eye,
  FileText,
  Image,
  Video,
  Music,
  Archive,
  Code,
  File,
  Paperclip,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { formatFileSize, getFileTypeIcon } from "@/utils/linkify.jsx";

// Icon mapping for file types
const iconComponents = {
  FileText,
  Image,
  Video,
  Music,
  Archive,
  Code,
  File,
  Sheet: FileText,
  Presentation: FileText,
};

export default function AttachmentDisplay({ attachments, className = "" }) {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewType, setPreviewType] = useState(null);

  if (!attachments || attachments.length === 0) {
    return null;
  }

  const handlePreview = (attachment) => {
    const extension = attachment.name?.split(".").pop()?.toLowerCase();
    const isImage = ["jpg", "jpeg", "png", "gif", "svg", "webp"].includes(
      extension
    );
    const isPdf = extension === "pdf";

    if (isImage || isPdf) {
      setPreviewUrl(attachment.url);
      setPreviewType(isImage ? "image" : "pdf");
    } else {
      // For other file types, open in new tab
      window.open(attachment.url, "_blank");
    }
  };

  const handleDownload = (attachment) => {
    const link = document.createElement("a");
    link.href = attachment.url;
    link.download = attachment.name || "attachment";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getFileTypeColor = (filename) => {
    const extension = filename?.split(".").pop()?.toLowerCase();

    const colorMap = {
      // Images - Blue
      jpg: "bg-blue-100 text-blue-700 border-blue-200",
      jpeg: "bg-blue-100 text-blue-700 border-blue-200",
      png: "bg-blue-100 text-blue-700 border-blue-200",
      gif: "bg-blue-100 text-blue-700 border-blue-200",
      svg: "bg-blue-100 text-blue-700 border-blue-200",
      webp: "bg-blue-100 text-blue-700 border-blue-200",

      // Documents - Green
      pdf: "bg-green-100 text-green-700 border-green-200",
      doc: "bg-green-100 text-green-700 border-green-200",
      docx: "bg-green-100 text-green-700 border-green-200",
      txt: "bg-green-100 text-green-700 border-green-200",
      rtf: "bg-green-100 text-green-700 border-green-200",

      // Spreadsheets - Emerald
      xls: "bg-emerald-100 text-emerald-700 border-emerald-200",
      xlsx: "bg-emerald-100 text-emerald-700 border-emerald-200",
      csv: "bg-emerald-100 text-emerald-700 border-emerald-200",

      // Presentations - Purple
      ppt: "bg-purple-100 text-purple-700 border-purple-200",
      pptx: "bg-purple-100 text-purple-700 border-purple-200",

      // Archives - Orange
      zip: "bg-orange-100 text-orange-700 border-orange-200",
      rar: "bg-orange-100 text-orange-700 border-orange-200",
      "7z": "bg-orange-100 text-orange-700 border-orange-200",
      tar: "bg-orange-100 text-orange-700 border-orange-200",
      gz: "bg-orange-100 text-orange-700 border-orange-200",

      // Code - Indigo
      js: "bg-indigo-100 text-indigo-700 border-indigo-200",
      html: "bg-indigo-100 text-indigo-700 border-indigo-200",
      css: "bg-indigo-100 text-indigo-700 border-indigo-200",
      json: "bg-indigo-100 text-indigo-700 border-indigo-200",
      xml: "bg-indigo-100 text-indigo-700 border-indigo-200",

      // Video - Red
      mp4: "bg-red-100 text-red-700 border-red-200",
      avi: "bg-red-100 text-red-700 border-red-200",
      mov: "bg-red-100 text-red-700 border-red-200",
      wmv: "bg-red-100 text-red-700 border-red-200",

      // Audio - Pink
      mp3: "bg-pink-100 text-pink-700 border-pink-200",
      wav: "bg-pink-100 text-pink-700 border-pink-200",
      flac: "bg-pink-100 text-pink-700 border-pink-200",

      // Default - Gray
      default: "bg-gray-100 text-gray-700 border-gray-200",
    };

    return colorMap[extension] || colorMap.default;
  };

  return (
    <>
      <Card className={`border-none shadow-lg ${className}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Paperclip className="w-5 h-5" />
            Attachments
            <Badge variant="outline" className="ml-auto">
              {attachments.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {attachments.map((attachment, index) => {
              const IconComponent =
                iconComponents[getFileTypeIcon(attachment.name)] || File;
              const colorClass = getFileTypeColor(attachment.name);
              const extension = attachment.name
                ?.split(".")
                .pop()
                ?.toLowerCase();
              const canPreview = [
                "jpg",
                "jpeg",
                "png",
                "gif",
                "svg",
                "webp",
                "pdf",
              ].includes(extension);

              return (
                <div
                  key={index}
                  className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white hover:from-slate-100 hover:to-slate-50 transition-all duration-200 group"
                >
                  {/* File Icon */}
                  <div
                    className={`p-3 rounded-lg border ${colorClass} group-hover:scale-105 transition-transform duration-200`}
                  >
                    <IconComponent className="w-6 h-6" />
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-slate-900 truncate text-sm">
                        {attachment.name || "Unnamed File"}
                      </h4>
                      <Badge variant="outline" className="text-xs font-mono">
                        {extension?.toUpperCase() || "FILE"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span className="font-medium">
                        {formatFileSize(attachment.size)}
                      </span>
                      {attachment.type && (
                        <>
                          <span>•</span>
                          <span>{attachment.type}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    {canPreview && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePreview(attachment)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Preview
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(attachment)}
                      className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </Button>

                    {attachment.url && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => window.open(attachment.url, "_blank")}
                        className="text-slate-500 hover:text-slate-700"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* File Upload Info */}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Enterprise File Security</p>
                <p className="text-xs text-blue-700">
                  All attachments are scanned for security threats and stored
                  with enterprise-grade encryption. Files are automatically
                  backed up and accessible to authorized team members only.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl max-h-[90vh] w-full overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-900">File Preview</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPreviewUrl(null);
                  setPreviewType(null);
                }}
                className="text-slate-500 hover:text-slate-700"
              >
                ✕
              </Button>
            </div>
            <div className="p-4 max-h-[calc(90vh-80px)] overflow-auto">
              {previewType === "image" ? (
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-w-full h-auto mx-auto rounded-lg shadow-lg"
                />
              ) : previewType === "pdf" ? (
                <iframe
                  src={previewUrl}
                  className="w-full h-[70vh] border-0 rounded-lg"
                  title="PDF Preview"
                />
              ) : null}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
