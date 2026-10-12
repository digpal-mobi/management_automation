declare module 'jsonwebtoken' {
  export interface SignOptions {
    expiresIn?: string | number;
    audience?: string | string[];
    issuer?: string;
    subject?: string;
    algorithm?: string;
  }

  export interface VerifyOptions {
    audience?: string | RegExp | Array<string | RegExp>;
    issuer?: string | string[];
    algorithms?: string[];
    ignoreExpiration?: boolean;
  }

  export function sign(
    payload: string | Buffer | object,
    secretOrPrivateKey: string | Buffer,
    options?: SignOptions
  ): string;

  export function verify(
    token: string,
    secretOrPublicKey: string | Buffer,
    options?: VerifyOptions
  ): any;

  export function decode(
    token: string,
    options?: { json?: boolean; complete?: boolean }
  ): any;

  export default {
    sign,
    verify,
    decode,
  };
}
