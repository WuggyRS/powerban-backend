import infisicalFacade from "../facade/InfisicalFacade.js";
const bjs = await import('@bananocoin/bananojs');
const bananojs = (bjs as any).default ?? bjs;

class WalletService {
  private seed: string | null;
  private defaultRepresentative: string;

  constructor() {
    bananojs.setBananodeApiUrl('https://kaliumapi.appditto.com/api');
    this.seed = null;
    this.defaultRepresentative = "ban_3batmanuenphd7osrez9c45b3uqw9d9u81ne8xa6m43e1py56y9p48ap69zg"; // batman
  }

  public async deriveBanAddress(seedIndex: number) {
    const seed = await this.getSeed();
    const privateKey = bananojs.getPrivateKey(seed, seedIndex);
    const publicKey = await bananojs.getPublicKey(privateKey);
    const address = bananojs.getBananoAccount(publicKey);

    return { address, publicKey, privateKey };
  }

  public async claimPendingBan(seedIx: number) {
    // 1. Determine representative (fall back if unopened)
    const seed = await this.getSeed();
    const { address } = await this.deriveBanAddress(seedIx);
    const account = address;

    // 2. Loop up to 10 times until there are no pending blocks
    for (let i = 0; i < 10; i++) {
      // Fetch up to 100 pending blocks
      const pending = await bananojs.getAccountsPending([account], 100, true);

      const blocks = pending?.blocks ?? {};
      const hashes = Object.keys(blocks);

      if (hashes.length === 0) {
        break;
      }

      console.log(`Receiving BAN deposits for seedIx ${seedIx}`);
      const response = await bananojs.receiveBananoDepositsForSeed(
        seed,
        seedIx,
        this.defaultRepresentative
      );

      console.log("Receive block response:", response);

      console.log(`Found ${hashes.length} pending block(s). Processing…`);

      // 3. Receive each pending block
      for (const hash of hashes) {
        console.log(
          `Receiving pending block ${hash} for account ${account} — amount: ${JSON.stringify(blocks[hash])}`
        );
      }

      // Small delay to avoid hitting rate limits
      await new Promise(res => setTimeout(res, 1000));
    }
  }

  public async sendBan(seedIx: string, toAccount: string, amount: string) {
    const seed = await this.getSeed();
    const txHash = await bananojs.sendBananoWithdrawalFromSeed(seed, seedIx, toAccount, amount);
    return txHash;
  }

  public async getBanBalance(account: string, raw: boolean = false) {
    const balance = await bananojs.getAccountBalanceRaw(account);
    if (raw) {
      return balance;
    }

    return this.formatBanFromRaw(balance);
  }

  private async getSeed() {
    if (this.seed) {
      return this.seed;
    }

    this.seed = await infisicalFacade.getSecret("BANANO_MASTER_SEED");
    return this.seed;
  }

  private formatBanFromRaw(raw: string | bigint): string {
    const ONE_BAN_RAW = 10n ** 29n;
    const rawBig = typeof raw === "bigint" ? raw : BigInt(raw);

    const whole = rawBig / ONE_BAN_RAW;
    let remainder = (rawBig % ONE_BAN_RAW).toString().padStart(29, "0");

    remainder = remainder.replace(/0+$/, "");
    return remainder ? `${whole}.${remainder}` : whole.toString();
  }
}

const walletService = new WalletService();
export default walletService;
