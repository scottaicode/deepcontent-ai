declare module 'mammoth' {
  interface ConversionMessage {
    type: string;
    message: string;
    location?: any;
  }
  
  interface ConversionResult {
    value: string;
    messages: ConversionMessage[];
  }
  
  interface ConversionOptions {
    styleMap?: string[];
    includeDefaultStyleMap?: boolean;
    includeEmbeddedStyleMap?: boolean;
    convertImage?: (image: { buffer: Buffer }) => Promise<{ src: string }>;
    ignoreEmptyParagraphs?: boolean;
  }
  
  interface ExtractOptions {
    arrayBuffer: ArrayBuffer;
    buffer?: never;
    path?: never;
  }
  
  function extractRawText(options: ExtractOptions): Promise<ConversionResult>;
  
  export { extractRawText };
} 