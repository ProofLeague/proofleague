import {
  AccountRole,
  getAddressEncoder,
  getProgramDerivedAddress,
  getU16Encoder,
  getU8Encoder,
  type Address,
  type Instruction,
} from "@solana/kit";

export const TXLINE_DEVNET_PROGRAM_ID =
  "6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J" as Address;
export const TXLINE_DEVNET_TOKEN_MINT =
  "4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG" as Address;

const ASSOCIATED_TOKEN_PROGRAM_ID =
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL" as Address;
const TOKEN_2022_PROGRAM_ID =
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb" as Address;
const SYSTEM_PROGRAM_ID = "11111111111111111111111111111111" as Address;

const SUBSCRIBE_DISCRIMINATOR = new Uint8Array([
  254, 28, 191, 138, 156, 179, 183, 53,
]);

const addressEncoder = getAddressEncoder();

function seed(value: string) {
  return new TextEncoder().encode(value);
}

function instruction(
  programAddress: Address,
  accounts: Instruction["accounts"],
  data: Uint8Array
): Instruction {
  return { programAddress, accounts, data };
}

export async function createTxlineSubscriptionInstructions(owner: Address) {
  const [pricingMatrix] = await getProgramDerivedAddress({
    programAddress: TXLINE_DEVNET_PROGRAM_ID,
    seeds: [seed("pricing_matrix")],
  });
  const [tokenTreasuryPda] = await getProgramDerivedAddress({
    programAddress: TXLINE_DEVNET_PROGRAM_ID,
    seeds: [seed("token_treasury_v2")],
  });
  const [userTokenAccount] = await getProgramDerivedAddress({
    programAddress: ASSOCIATED_TOKEN_PROGRAM_ID,
    seeds: [
      addressEncoder.encode(owner),
      addressEncoder.encode(TOKEN_2022_PROGRAM_ID),
      addressEncoder.encode(TXLINE_DEVNET_TOKEN_MINT),
    ],
  });
  const [tokenTreasuryVault] = await getProgramDerivedAddress({
    programAddress: ASSOCIATED_TOKEN_PROGRAM_ID,
    seeds: [
      addressEncoder.encode(tokenTreasuryPda),
      addressEncoder.encode(TOKEN_2022_PROGRAM_ID),
      addressEncoder.encode(TXLINE_DEVNET_TOKEN_MINT),
    ],
  });

  const createTokenAccountInstruction = instruction(
    ASSOCIATED_TOKEN_PROGRAM_ID,
    [
      { address: owner, role: AccountRole.WRITABLE_SIGNER },
      { address: userTokenAccount, role: AccountRole.WRITABLE },
      { address: owner, role: AccountRole.READONLY },
      { address: TXLINE_DEVNET_TOKEN_MINT, role: AccountRole.READONLY },
      { address: SYSTEM_PROGRAM_ID, role: AccountRole.READONLY },
      { address: TOKEN_2022_PROGRAM_ID, role: AccountRole.READONLY },
    ],
    new Uint8Array([1])
  );

  const subscribeData = new Uint8Array([
    ...SUBSCRIBE_DISCRIMINATOR,
    ...getU16Encoder().encode(1),
    ...getU8Encoder().encode(4),
  ]);
  const subscribeInstruction = instruction(
    TXLINE_DEVNET_PROGRAM_ID,
    [
      { address: owner, role: AccountRole.WRITABLE_SIGNER },
      { address: pricingMatrix, role: AccountRole.READONLY },
      { address: TXLINE_DEVNET_TOKEN_MINT, role: AccountRole.READONLY },
      { address: userTokenAccount, role: AccountRole.WRITABLE },
      { address: tokenTreasuryVault, role: AccountRole.WRITABLE },
      { address: tokenTreasuryPda, role: AccountRole.READONLY },
      { address: TOKEN_2022_PROGRAM_ID, role: AccountRole.READONLY },
      { address: SYSTEM_PROGRAM_ID, role: AccountRole.READONLY },
      { address: ASSOCIATED_TOKEN_PROGRAM_ID, role: AccountRole.READONLY },
    ],
    subscribeData
  );

  return {
    instructions: [createTokenAccountInstruction, subscribeInstruction],
    addresses: {
      pricingMatrix,
      tokenTreasuryPda,
      tokenTreasuryVault,
      userTokenAccount,
    },
  };
}
