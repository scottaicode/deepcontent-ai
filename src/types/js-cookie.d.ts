declare module 'js-cookie' {
  export interface CookieAttributes {
    path?: string;
    expires?: number | Date;
    domain?: string;
    secure?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
  }

  export function get(name: string): string | undefined;
  export function set(name: string, value: string, options?: CookieAttributes): string | undefined;
  export function remove(name: string, options?: CookieAttributes): void;
  export default {
    get,
    set,
    remove
  };
} 