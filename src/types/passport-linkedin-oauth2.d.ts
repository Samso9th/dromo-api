declare module "passport-linkedin-oauth2" {
  import { Strategy as PassportStrategy } from "passport";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type Verify = (accessToken: string, refreshToken: string, profile: any, done: (err: unknown, user?: unknown) => void) => void;

  export class Strategy extends PassportStrategy {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(options: any, verify: Verify);
    name: string;
  }
  export const OAuth2Strategy: typeof Strategy;
}
