declare module 'jwks-client' {
  export interface JwksClient {
    getSigningKey(kid: string, callback: (err: any, key: any) => void): void;
  }

  export interface JwksClientOptions {
    jwksUri: string;
    cache?: boolean;
    cacheMaxAge?: number;
    cacheMaxEntries?: number;
    rateLimit?: boolean;
    jwksRequestsPerMinute?: number;
    jwksUri?: string;
    timeout?: number;
    requestHeaders?: Record<string, string>;
    requestAgent?: any;
    handleSigningKeyError?: (err: Error, cb: (err: Error) => void) => void;
  }

  export function JwksClient(options: JwksClientOptions): JwksClient;
  export default JwksClient;
}
