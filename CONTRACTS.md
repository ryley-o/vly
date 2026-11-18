# VLY-1 On-chain Design

> **Status: on the shelf.** The product direction is browser and hardware first, with no crypto in the first cut.
> The cartridge format stays compatible with everything below (small immutable images, a 1 KB save), and this design
> and its tests are kept so it can be picked up again. Nothing here is deployed or audited.

**Status:** Draft 0.2. Informative companion to `SPEC.md`. The contracts in `contracts/src` implement this design and
are tested in an in-process EVM (`cd contracts && npm install && npm test`). They have **not been audited**.

The machine (`SPEC.md`) knows nothing about any of this: it only sees ROM bytes and a 1 KB save.

## 1. Layers

```
  ROM chunks         immutable data contracts holding the cartridge bytes (shared, content-addressed)
      ^
  Game               one contract per title: chunk list + ERC-721 collection (EIP-1167 clone, immutable)
      ^
  Cartridge (token)  one printed copy: an ERC-721 token with its own 1 KB save
```

This mirrors physical hardware: the ROM is shared and cheap to reproduce, and the battery-backed save is the part
that belongs to each copy.

## 2. ROM chunks (`VlyChunk.sol`, `ChunkDeployer.sol`)

- A chunk is a contract whose deployed code is `0x00` followed by up to **24,575** bytes of cartridge data (the
  SSTORE2 convention; the leading `STOP` makes an accidental call harmless). Chunks contain no logic.
- The cartridge image is the concatenation of the chunks' payloads, in order, up to **1,048,576 bytes** (at most 43
  chunks). Every chunk except the last must be full.
- **Content addressing:** chunks are deployed with CREATE2 using `salt = keccak256(payload)`, so the address is a
  function of the deployer and the bytes. Deploying a chunk that already exists is a cheap no-op (about 20k gas or
  less), so games and tokens share chunks automatically.
- **Creation code** (identical in `src/tools/chunks.js` and `VlyChunk.sol`):
  `61 <len16> 80 60 0a 3d 39 3d f3 00 <payload>`, i.e. `PUSH2 len; DUP1; PUSH1 0x0a; RETURNDATASIZE; CODECOPY;
  RETURNDATASIZE; RETURN` followed by the runtime code `0x00 ++ payload`.
- **Cost** (measured on an EVM): a full 24,575-byte chunk is about 5.1 million gas to deploy. A 1 MB cartridge
  (43 chunks) is roughly 220 million gas. Practical on L2s; expensive on Ethereum mainnet.
- Tooling: `vly chunks <cart>` prints the plan, including each chunk's creation code, salt and the ROM hash.

## 3. Game contract (`VlyCartridge.sol`, `VlyFactory.sol`)

A game is a minimal-proxy clone (EIP-1167, 45 bytes of code) of one `VlyCartridge` implementation, created by
`VlyFactory.create(config)` and initialized **once**. After initialization it cannot change.

| Config field | Meaning |
|---|---|
| `name`, `symbol`, `baseURI` | ERC-721 metadata; `tokenURI = baseURI + tokenId` |
| `chunks[]` | ordered ROM chunk contracts (validated: real chunks, all full except the last) |
| `romSize` | exact image length in bytes; must equal the sum of the chunk payloads (at most 1 MB) |
| `romHash` | `keccak256` of the full image; verified by players off-chain |
| `specVersion` | must be `1` |
| `maxSupply`, `mintPrice`, `mintStart` | how many copies can ever be printed, price in wei, opening time |
| `payout`, `royaltyBps` | receives mint proceeds and ERC-2981 royalties (at most 10%) |

Properties:

- No owner, no admin, no upgrade path, no way to change anything after initialization. The implementation contract
  locks itself so it cannot be initialized or used directly.
- It is an ERC-721 collection with ERC-2981 royalties, so wallets and marketplaces can list it.
- Creating a game costs about 300k gas. Minting a copy costs about 85k gas.

## 4. Cartridge tokens and saves

- Each token is one printed copy. **Printing is minting**: no new bytecode.
- Each token has a **1,024-byte save** in the game contract's storage, keyed by `tokenId`.
- **Only the token's owner can write its save.** ERC-721 approved operators (for example a marketplace) cannot, so a
  listing can never be used to overwrite someone's progress. Transfers carry the save to the new owner.
- **Raw save call:** calldata is exactly 32 bytes (`tokenId`, big-endian) followed by 1,024 bytes of save data, with
  **no function selector**. A token id below 2^224 yields a zero selector, which no function uses, so the call lands in
  the contract's `fallback()`. Anything but exactly 1,056 bytes reverts with `BadSaveLength`.
- **ABI save call:** `save(uint256 tokenId, bytes data)` does the same with standard encoding.
- `saveOf(tokenId)` returns the 1,024 bytes, or an empty result if the token has never been saved. The emulator
  treats "empty" as no save and starts with zeros (`STATUS.SAVE_LOADED = 0`). `hasSave(tokenId)` is also available.
- Saves are public and trust-based in v1: the contract does not validate the contents.
- **Cost** (measured): the first save writes 32 storage words, about 750k gas; later saves about 110k gas. Fine on L2s.

## 5. Generative cartridges

A creator who wants every cartridge to be different has the creator's own initcode assemble the ROM bytes and deploy
fresh chunk contracts for each. Two ways to attach them:

1. **A game per cartridge:** call `VlyFactory.create` with that chunk list. Simple, and a clone is cheap.
2. **A per-token chunk list** (not implemented yet): a collection variant that stores a chunk list per token at mint.

Either way the emulator receives a chunk list and a ROM size; the machine never knows which mode was used.

## 6. How a player loads a cartridge

1. Read the game's configuration: `chunks()`, `romSize()`, `romHash()`, `specVersion()`.
2. Fetch every chunk's code in parallel (`eth_getCode`); strip the leading `0x00`; concatenate; trim to `romSize`.
3. Verify `keccak256(image) == romHash` (`src/tools/keccak.js` is a pure-JS implementation for browsers).
4. Cache the image by `romHash`. Chunks are immutable, so the cache never goes stale.
5. Read `saveOf(tokenId)` for the cartridge being played.
6. Run the emulator. When the cartridge writes to `SAVECTL`, offer to submit the raw save call.

## 7. Putting a cartridge on chain (the tooling)

`vly chunks` does all the off-chain work. Given the address of a deployed `ChunkDeployer` (anyone can deploy one, or
reuse a shared one; chunks are content-addressed, so a chunk already stored by anyone is reused at nearly no cost):

```sh
vly build                                              # build/mygame.vlc
vly chunks build/mygame.vlc --deployer 0xCHUNK_DEPLOYER --out-dir deploy
#   deploy/plan.json           chunk sizes, hashes, creation code, gas estimates
#   deploy/chunk_0.calldata    ChunkDeployer.deploy(bytes) calldata for each chunk, ready to send as-is
#   deploy/create-config.json  the Config for VlyFactory.create, chunk addresses and ROM hash filled in
```

Then, with any wallet tool (shown with Foundry's `cast`; nothing here is specific to it):

```sh
for f in deploy/chunk_*.calldata; do cast send 0xCHUNK_DEPLOYER "$(cat $f)" --rpc-url $RPC --private-key $KEY; done
# fill in name, symbol, baseURI, supply, price and payout in deploy/create-config.json, then call
# VlyFactory.create(config) with it
```

The predicted chunk addresses are computed off-chain (`CREATE2` from the deployer, `salt = keccak256(payload)`), and the
test suite sends the generated calldata to `ChunkDeployer` in an in-process EVM and checks that the chunks land at those
exact addresses and reassemble to the ROM hash. The calldata is the standard ABI encoding of `deploy(bytes)`. What has
**not** been done: deploying to a live network, a registry, or an audit.

## 8. Open questions

- Supply and pricing models beyond fixed price and fixed supply: open editions, allowlists, auctions.
- A per-token chunk list for generative cartridges (5.2).
- A registry so players can discover games, and what `tokenURI` should return (title, artist, a hosted player link).
- Which chains to launch on, given the gas cost of large ROMs.
- An on-chain check that the ROM hash is correct. Hashing up to 1 MB on-chain is probably too costly, so it is
  checked off-chain by players.
- An audit before any mainnet use.
