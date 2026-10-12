declare module 'pdf-parse' {
  export class PDFParse {
    constructor(options: { data?: Buffer | Uint8Array | ArrayBuffer; url?: string });
    getText(params?: any): Promise<{
      pages: Array<{ num: number; text: string }>;
      text: string;
      total: number;
    }>;
    getInfo(params?: any): Promise<any>;
    destroy(): Promise<void>;
  }

  interface PDFData {
    numpages: number;
    numrender: number;
    info: any;
    metadata: any;
    version: string;
    text: string;
  }

  function PDFParseFunction(
    dataBuffer: Buffer | Uint8Array,
    options?: any
  ): Promise<PDFData>;

  export default PDFParseFunction;
}
