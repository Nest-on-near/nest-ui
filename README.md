`nest-ui` is the frontend for the NEST oracle + DVM flow.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Environment Setup

Create your local env file:

```bash
cp .env.example .env.local
```

The UI supports per-network contract overrides.
For current testnet deployment, set:

```bash
NEXT_PUBLIC_TESTNET_ORACLE=nest-oracle-6.testnet
NEXT_PUBLIC_TESTNET_VOTING=nest-voting-4.testnet
NEXT_PUBLIC_TESTNET_VOTING_TOKEN=nest-token-2.testnet
NEXT_PUBLIC_TESTNET_VAULT=nest-vault-2.testnet
NEXT_PUBLIC_TESTNET_COLLATERAL_TOKEN=mocknear-1.testnet
NEXT_PUBLIC_TESTNET_FINDER=nest-finder-2.testnet
NEXT_PUBLIC_TESTNET_STORE=nest-store-2.testnet
NEXT_PUBLIC_TESTNET_REGISTRY=nest-registry-2.testnet
NEXT_PUBLIC_TESTNET_IDENTIFIER_WHITELIST=nest-whitelist-1.testnet
NEXT_PUBLIC_TESTNET_SLASHING_LIBRARY=nest-slashing-2.testnet
```

`NEXT_PUBLIC_INDEXER_URL` should point to your indexer instance.

## Notes

- `/app/vote` includes:
  - NEST and collateral storage registration actions.
  - Vault collateral deposit flow (`ft_transfer_call`) to mint NEST.
- Wallet must be connected on testnet and signed-in account must have gas.

## Learn More about NEAR

To learn more about NEAR, take a look at the following resources:

- [NEAR Documentation](https://docs.near.org) - learn about NEAR.
- [Frontend Docs](https://docs.near.org/build/web3-apps/quickstart) - learn about this example.

You can check out [the NEAR repository](https://github.com/near) - your feedback and contributions are welcome!

## Learn More about Next.js

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
