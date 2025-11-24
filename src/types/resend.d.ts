declare module "resend" {
  export class Resend {
    constructor(apiKey: string);
    sendEmail(params: { to: string; subject: string; html: string }): Promise<any>;
  }
}
