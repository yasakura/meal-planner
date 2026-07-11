declare module 'qrcode-terminal' {
  interface QRCodeTerminal {
    generate(text: string, options?: { small?: boolean }): void;
    generate(text: string, callback?: (qrcode: string) => void): void;
    generate(text: string, options: { small?: boolean }, callback: (qrcode: string) => void): void;
    setErrorLevel(level: 'L' | 'M' | 'Q' | 'H'): void;
  }
  const qrcode: QRCodeTerminal;
  export default qrcode;
}
