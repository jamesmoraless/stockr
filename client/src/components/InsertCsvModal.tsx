"use client";

import React, { useState, FC } from "react";
import { getAuth } from "firebase/auth";
import "@fortawesome/fontawesome-free/css/all.min.css";

interface InsertCsvModalProps {
  onClose: () => void;
  onUploadSuccess?: () => void;
}

async function getFirebaseIdToken(): Promise<string> {
  const auth = getAuth();
  return new Promise((resolve, reject) => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      unsubscribe();
      if (user) {
        const token = await user.getIdToken();
        resolve(token);
      } else {
        resolve("");
      }
    }, reject);
  });
}

const InsertCsvModal: FC<InsertCsvModalProps> = ({ onClose, onUploadSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file.");
      return;
    }
    setLoading(true);
    setError("");
    setSuccessMessage("");
    try {
      const token = await getFirebaseIdToken();
      const formData = new FormData();
      formData.append("file", file);
      // Note: Do not manually set Content-Type for FormData!
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/transactions/upload-transactions`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to upload file");
      }
      setSuccessMessage("File uploaded successfully.");
      if (onUploadSuccess) onUploadSuccess();
      // Optionally, close the modal automatically:
      // onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 shadow-lg w-full max-w-2xl relative">

        {/* Modal header */}
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl tracking-[-0.04em]">Upload CSV</h1>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center transition-all -mt-3"
            aria-label="Close modal"
          >
            <span className="relative w-5 h-5 flex items-center justify-center">
              <i className="fas fa-times text-gray-400"></i>
            </span>
          </button>
        </div>

        {/* File input */}
        <div className="mb-4">
          <input
            type="file"
            accept=".csv, .xls, .xlsx"
            onChange={handleFileChange}
            className="custom-file-input text-gray-500 tracking-[-0.08em]"
          />
        </div>

        {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
        {successMessage && <p className="text-green-500 text-sm mb-2">{successMessage}</p>}

        {/* Upload button */}
        <div className="flex space-x-4 mt-6">
          <button
            onClick={handleUpload}
            disabled={loading}
            className="w-full p-2 bg-black text-white rounded-md tracking-[-0.04em] transition-all hover:bg-black/90"
          >
            {loading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </div>

      <style jsx>{`
        /* For modern browsers */
        .custom-file-input::file-selector-button {
          background-color: #f5f5f5;
          color: #333;
          border: 1px solid #ccc;
          padding: 8px 16px;
          margin-right: 10px;
          cursor: pointer;
          letter-spacing: -0.08em;
          transition: background 0.2s ease-in-out;
        }
        .custom-file-input::file-selector-button:hover {
          background-color: #e0e0e0;
        }
        .custom-file-input::file-selector-button:active {
          background-color: #d6d6d6;
        }

        /* For Safari < 15.4 and other older browsers */
        .custom-file-input::-webkit-file-upload-button {
          background-color: #f5f5f5;
          color: #333;
          border: 1px solid #ccc;
          padding: 8px 16px;
          letter-spacing: -0.08em;
          margin-right: 10px;
          cursor: pointer;
          transition: background 0.2s ease-in-out;
        }
        .custom-file-input::-webkit-file-upload-button:hover {
          background-color: #e0e0e0;
        }
        .custom-file-input::-webkit-file-upload-button:active {
          background-color: #d6d6d6;
        }
      `}</style>
    </div>
  );
};

export default InsertCsvModal;
