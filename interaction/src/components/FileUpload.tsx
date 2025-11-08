/**
 * FileUpload component - Upload button with file picker
 */

import { useRef, type ChangeEvent } from 'react';
import { Upload } from 'lucide-react';
import { Button } from './ui/button';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

const ACCEPTED_TYPES = '.txt,.md,.pdf';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function FileUpload({ onFileSelect, disabled = false }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        alert(`File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`);
        return;
      }
      onFileSelect(file);
      // Reset input to allow uploading the same file again
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />
      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={disabled}
        title="Upload file (.txt, .md, .pdf)"
      >
        <Upload className="h-4 w-4" />
        Upload
      </Button>
    </>
  );
}
