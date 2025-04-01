declare module 'pdf-parse' {
  interface PDFData {
    text: string;
    numpages: number;
    info: Record<string, any>;
    metadata: Record<string, any>;
    version: string;
  }
  
  type PDFParseOptions = {
    pagerender?: (pageData: any) => Promise<string>;
    max?: number;
  };
  
  function PDFParse(dataBuffer: Buffer | Uint8Array, options?: PDFParseOptions): Promise<PDFData>;
  
  export = PDFParse;
} 