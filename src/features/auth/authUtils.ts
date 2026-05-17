export type Navigate = (path: string, replace?: boolean) => void;

export function authPath(path: string) {
  return path.startsWith('/auth') ? path : `/auth${path}`;
}
