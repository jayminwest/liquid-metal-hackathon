/**
 * MarkdownBrowser component - Browse and view markdown files from data directory
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Folder, File, ChevronRight, ChevronDown, X } from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

interface FileItem {
  name: string;
  isDirectory: boolean;
}

interface MarkdownBrowserProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MarkdownBrowser({ isOpen, onClose }: MarkdownBrowserProps) {
  const [currentPath, setCurrentPath] = useState('');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());

  useEffect(() => {
    console.log('[MarkdownBrowser] useEffect triggered - isOpen:', isOpen, 'currentPath:', currentPath);
    if (isOpen) {
      loadDirectory(currentPath);
    }
  }, [isOpen, currentPath]);

  const loadDirectory = async (path: string) => {
    setLoading(true);
    setError(null);

    // Add timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      console.log('[MarkdownBrowser] Loading directory:', path);
      const url = `http://localhost:3000/api/knowledge/browse?path=${encodeURIComponent(path)}`;
      console.log('[MarkdownBrowser] Fetch URL:', url);

      const response = await fetch(url, {
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      console.log('[MarkdownBrowser] Response status:', response.status);
      console.log('[MarkdownBrowser] Response OK:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[MarkdownBrowser] Error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[MarkdownBrowser] Received data:', data);
      console.log('[MarkdownBrowser] Files count:', data.files?.length || 0);
      setFiles(data.files || []);
      setError(null);
    } catch (err) {
      clearTimeout(timeoutId);
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[MarkdownBrowser] Error loading directory:', err);
      setError(errorMsg);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const loadFile = async (path: string) => {
    setLoading(true);
    try {
      const url = `http://localhost:3000/api/knowledge/file?path=${encodeURIComponent(path)}`;
      console.log('[MarkdownBrowser] Loading file:', url);
      const response = await fetch(url);
      const data = await response.json();
      setFileContent(data.content || '');
      setSelectedFile(path);
    } catch (error) {
      console.error('[MarkdownBrowser] Error loading file:', error);
      setFileContent('Error loading file');
    } finally {
      setLoading(false);
    }
  };

  const handleFileClick = (file: FileItem) => {
    const fullPath = currentPath ? `${currentPath}/${file.name}` : file.name;

    if (file.isDirectory) {
      if (expandedDirs.has(fullPath)) {
        const newExpanded = new Set(expandedDirs);
        newExpanded.delete(fullPath);
        setExpandedDirs(newExpanded);
      } else {
        setExpandedDirs(new Set(expandedDirs).add(fullPath));
        setCurrentPath(fullPath);
      }
    } else if (file.name.endsWith('.md')) {
      loadFile(fullPath);
    }
  };

  const goBack = () => {
    const parts = currentPath.split('/').filter(p => p);
    parts.pop();
    setCurrentPath(parts.join('/'));
  };

  const htmlContent = fileContent ? DOMPurify.sanitize(marked.parse(fileContent) as string) : '';

  console.log('[MarkdownBrowser] Render - isOpen:', isOpen, 'loading:', loading, 'files:', files.length);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-border rounded-lg shadow-2xl max-w-6xl w-full h-[80vh] flex flex-col"
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Knowledge Base Browser</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* File Tree */}
          <div className="w-64 border-r border-border overflow-y-auto p-4">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-sm text-muted-foreground">Loading...</div>
              </div>
            ) : error ? (
              <div className="p-4 text-sm text-destructive">
                <p className="font-semibold mb-1">Error</p>
                <p>{error}</p>
              </div>
            ) : (
              <div className="space-y-1">
                {currentPath && (
                  <button
                    onClick={goBack}
                    className="flex items-center gap-2 px-2 py-1 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded w-full"
                  >
                    <ChevronRight className="h-4 w-4 rotate-180" />
                    ..
                  </button>
                )}

                {files.length === 0 && (
                  <div className="p-4 text-sm text-muted-foreground text-center">
                    No files found
                  </div>
                )}

                {files.map((file) => {
                const fullPath = currentPath ? `${currentPath}/${file.name}` : file.name;
                const isExpanded = expandedDirs.has(fullPath);
                const isSelected = selectedFile === fullPath;

                return (
                  <button
                    key={file.name}
                    onClick={() => handleFileClick(file)}
                    className={cn(
                      'flex items-center gap-2 px-2 py-1.5 text-sm rounded w-full text-left transition-colors',
                      isSelected
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    {file.isDirectory ? (
                      <>
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 shrink-0" />
                        )}
                        <Folder className="h-4 w-4 shrink-0" />
                      </>
                    ) : (
                      <>
                        <File className="h-4 w-4 shrink-0 ml-5" />
                      </>
                    )}
                    <span className="truncate">{file.name}</span>
                  </button>
                );
              })}
              </div>
            )}
          </div>

          {/* Content Viewer */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-muted-foreground">Loading...</div>
              </div>
            ) : selectedFile ? (
              <div>
                <div className="mb-4 pb-2 border-b border-border">
                  <h3 className="text-sm font-mono text-muted-foreground">{selectedFile}</h3>
                </div>
                <div
                  className={cn(
                    'prose prose-sm dark:prose-invert max-w-none',
                    'prose-pre:bg-secondary prose-pre:border prose-pre:border-border',
                    'prose-code:text-primary prose-code:bg-secondary prose-code:px-1 prose-code:py-0.5 prose-code:rounded',
                    'prose-a:text-primary hover:prose-a:text-primary/80'
                  )}
                  dangerouslySetInnerHTML={{ __html: htmlContent }}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-muted-foreground">
                  <Folder className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Select a markdown file to view</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
