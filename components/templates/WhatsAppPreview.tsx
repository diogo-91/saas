'use client';

import { ImageIcon, FileText, Video, MessageSquare } from 'lucide-react';

interface TemplateComponent {
  type: string;
  format?: string;
  text?: string;
  buttons?: { type: string; text: string; url?: string; phone_number?: string }[];
}

interface WhatsAppPreviewProps {
  components: TemplateComponent[];
  variables?: Record<string, string>;
}

export function WhatsAppPreview({ components = [], variables = {} }: WhatsAppPreviewProps) {
  const replaceVars = (text: string) => {
    return text.replace(/\{\{(\d+)\}\}/g, (_, n) => variables[n] || `{{${n}}}`);
  };

  const header = components.find((c) => c.type === 'HEADER');
  const body = components.find((c) => c.type === 'BODY');
  const footer = components.find((c) => c.type === 'FOOTER');
  const buttonsComponent = components.find((c) => c.type === 'BUTTONS');

  const renderHeader = () => {
    if (!header) return null;
    if (header.format === 'IMAGE') {
      return (
        <div className="bg-muted rounded-t-lg h-32 flex items-center justify-center border-b">
          <ImageIcon className="h-8 w-8 text-muted-foreground" />
        </div>
      );
    }
    if (header.format === 'VIDEO') {
      return (
        <div className="bg-muted rounded-t-lg h-32 flex items-center justify-center border-b">
          <Video className="h-8 w-8 text-muted-foreground" />
        </div>
      );
    }
    if (header.format === 'DOCUMENT') {
      return (
        <div className="bg-muted rounded-t-lg h-16 flex items-center gap-2 px-3 border-b">
          <FileText className="h-6 w-6 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Document</span>
        </div>
      );
    }
    if (header.text) {
      return (
        <div className="px-3 pt-3">
          <p className="font-bold text-sm text-foreground">{replaceVars(header.text)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full max-w-xs mx-auto">
      {/* Phone frame */}
      <div className="bg-[#ECE5DD] dark:bg-[#0d1117] rounded-2xl p-4 shadow-lg">
        <div className="space-y-1">
          {/* Message bubble */}
          <div className="bg-white dark:bg-[#1e2a35] rounded-lg shadow-sm overflow-hidden max-w-[280px]">
            {renderHeader()}

            {body?.text && (
              <div className="px-3 py-2">
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {replaceVars(body.text)}
                </p>
              </div>
            )}

            {footer?.text && (
              <div className="px-3 pb-2">
                <p className="text-xs text-muted-foreground">{replaceVars(footer.text)}</p>
              </div>
            )}

            <div className="px-3 pb-1 flex justify-end">
              <span className="text-[10px] text-muted-foreground">12:00 ✓✓</span>
            </div>

            {buttonsComponent?.buttons && buttonsComponent.buttons.length > 0 && (
              <div className="border-t">
                {buttonsComponent.buttons.map((btn, i) => (
                  <button
                    key={i}
                    className="w-full py-2 text-sm text-blue-500 font-medium border-b last:border-0 hover:bg-muted/50 transition-colors"
                  >
                    {btn.text}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {(!components || components.length === 0) && (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <MessageSquare className="h-8 w-8 mb-2 opacity-40" />
          <p className="text-sm">Preview will appear here</p>
        </div>
      )}
    </div>
  );
}
