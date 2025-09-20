import { InfisicalSDK } from "@infisical/sdk";

class InfisicalFacade {
  private client = new InfisicalSDK();
  private initPromise: Promise<void> | null = null;
  private isInitialized = false;

  constructor() {}

  private async ensureInit() {
    if (this.isInitialized) return;

    if (!this.initPromise) {
      this.initPromise = this.client.auth().universalAuth.login({
        clientId: process.env.INFISICAL_CLIENT_ID!,
        clientSecret: process.env.INFISICAL_CLIENT_SECRET!,
      }).then(() => {
        this.isInitialized = true;
      });
    }

    return this.initPromise;
  }

  public async getSecret(secretName: string): Promise<string> {
    await this.ensureInit();

    const environment = process.env.NODE_ENVIRONMENT || "prod";

    const secret = await this.client.secrets().getSecret({
      projectId: process.env.INFISICAL_PROJECT_ID!,
      environment,
      secretName,
    });

    return secret.secretValue;
  }
}

const infisicalFacade = new InfisicalFacade();
export default infisicalFacade;