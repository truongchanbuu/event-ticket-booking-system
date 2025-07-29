"use client";

import { useState } from "react";
import { Download, Eye, FileText } from "lucide-react";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import Image from "next/image";

type DocumentItemProps = {
  doc: { name: string; url: string };
};

export const DocumentItem: React.FC<DocumentItemProps> = ({ doc }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
        <div className="flex items-center space-x-3 overflow-hidden">
          <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
          <div className="overflow-hidden">
            <p className="text-sm font-medium text-gray-900 truncate">
              {doc.name}
            </p>
            <p className="text-xs text-gray-500">Image</p>
          </div>
        </div>
        <div className="flex space-x-2 flex-shrink-0">
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                onClick={() => setIsOpen(true)}
                className="p-2 rounded-md text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                title="View"
              >
                <Eye className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl w-full p-4">
              <DialogTitle>{doc.name}</DialogTitle>
              <DialogDescription>{doc.name}</DialogDescription>
              <Image
                fill
                src={doc.url}
                alt={doc.name}
                className="max-h-[90vh] w-full object-contain rounded"
              />
            </DialogContent>
          </Dialog>

          <Button
            variant="ghost"
            size="icon"
            className="text-gray-500 hover:text-green-600 hover:bg-green-50"
          >
            <a href={doc.url} download title="Download">
              <Download className="w-4 h-4" />
            </a>
          </Button>
        </div>
      </div>
    </>
  );
};
