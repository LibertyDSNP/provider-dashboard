// @ts-ignore
import {ApiPromise} from "@polkadot/api/promise";
// @ts-ignore
// import { SignerResult } from "@polkadot/types";
import {isLocalhost, waitFor} from "$lib/utils";

import type {KeyringPair} from "@polkadot/keyring/types";
import type {InjectedAccountWithMeta, InjectedExtension} from "@polkadot/extension-inject/types";
import {isFunction, u8aToHex, u8aWrapBytes} from "@polkadot/util";
import type {SignerPayloadRaw, SignerResult} from "@polkadot/types/types";
import type {SubmittableExtrinsic} from "@polkadot/api/promise/types";
import type {EventRecord, ExtrinsicStatus} from "@polkadot/types/interfaces";

export const ProviderMap: Record<string,string> = {
    Rococo: 'wss://rpc.rococo.frequency.xyz',
    Localhost: 'ws://localhost:9944',
    Other: 'wss://some.node',
}

export const GENESIS_HASHES: Record<string, string> = {
    Rococo: "0x0c33dfffa907de5683ae21cc6b4af899b5c4de83f3794ed75b2dc74e1b088e72",
    frequency: "0x4a587bf17a404e3572747add7aab7bbe56e805a5479c6c436f07f36fcc8d3ae1",
}

type AddKeyData = { msaId: string; expiration: string; newPublicKey: string; }
type SigningKey = InjectedAccountWithMeta | KeyringPair

export const CENTS = 1000000n;
export const DOLLARS = 100n * CENTS;

// No functions in here should have to talk to a component
export async function getBlockNumber(api: ApiPromise): Promise<BigInt> {
    if (api && await api.isReady) {
        let blockData = await api.rpc.chain.getBlock();
        return blockData.block.header.number.toBigInt()
    }
    return 0n;
}

export async function getEpoch(api: ApiPromise): Promise<BigInt> {
    if (api && await api.isReady) {
        return (await api.query.capacity.currentEpoch()).toBigInt();
    }
    return 0n;
}

// creates the payloads and gets or creates the signatures, then submits the extrinsic
export async function submitAddControlKey(api: ApiPromise,
                                          extension: InjectedExtension | undefined,
                                          newAccount: SigningKey,
                                          signingAccount: SigningKey,
                                          providerId: number,
                                          endpointURL: string,
                                          callback: (statusStr: string) => void) {
    const blockNumber = await getBlockNumber(api) as bigint
    if (api && await api.isReady) {
        const rawPayload: AddKeyData = {
            msaId: providerId.toString(),
            expiration: (blockNumber + 100n).toString(),
            newPublicKey: newAccount.address,
        }

        const newKeyPayload = api.registry.createType("PalletMsaAddKeyData", rawPayload);
        const useKeyring: boolean = isLocalhost(endpointURL);

        const ownerKeySignature = useKeyring ?
            signPayloadWithKeyring(signingAccount as KeyringPair, newKeyPayload) :
            await signPayloadWithExtension(extension as InjectedExtension, signingAccount as InjectedAccountWithMeta, newKeyPayload);

        const newKeySignature = useKeyring ?
            signPayloadWithKeyring(newAccount as KeyringPair, newKeyPayload) :
            await signPayloadWithExtension(extension as InjectedExtension, newAccount as InjectedAccountWithMeta, newKeyPayload);

        const ownerKeyProof = { Sr25519: ownerKeySignature };
        const newKeyProof = { Sr25519: newKeySignature };
        const extrinsic = api.tx.msa.addPublicKeyToMsa(signingAccount.address, ownerKeyProof, newKeyProof, newKeyPayload);
       useKeyring ?
            await submitExtrinsicWithKeyring(extrinsic, signingAccount as KeyringPair, callback):
            await submitExtrinsicWithExtension(extension as InjectedExtension, extrinsic, signingAccount as InjectedAccountWithMeta, callback);

    } else {
        console.debug("api is not available.");
    }
}

// creates the payloads and gets or creates the signatures, then submits the extrinsic
export async function submitStake(api: ApiPromise,
                                          extension: InjectedExtension | undefined,
                                          signingAccount: SigningKey,
                                          providerId: number,
                                          stakeAmount: bigint,
                                          endpointURL: string,
                                          callback: (statusStr: string) => void) {
    if (api && await api.isReady) {
        const useKeyring: boolean = isLocalhost(endpointURL);

        const extrinsic = api.tx.capacity.stake(providerId, stakeAmount);
        useKeyring ?
            await submitExtrinsicWithKeyring(extrinsic, signingAccount as KeyringPair, callback):
            await submitExtrinsicWithExtension(extension as InjectedExtension, extrinsic, signingAccount as InjectedAccountWithMeta, callback);

    } else {
        console.debug("api is not available.");
    }
}


type TxnStatusCallback = (txnStatus: string) => void;

// log and call the callback with the status.
function showExtrinsicStatus(txnStatus: string, cb: TxnStatusCallback) {
    console.debug("Transaction status: ", txnStatus)
    cb(txnStatus)
}

// figure out how to display the transaction status as it is updated
export async function parseChainEvent (
    { events = [], status }: {  events?: EventRecord[], status: ExtrinsicStatus; },
       txnStatusCallback: TxnStatusCallback): Promise<void> {
    try {
        if (status.isInvalid) {
            const statusStr = "Invalid transaction";
            showExtrinsicStatus(statusStr, txnStatusCallback);
            return;
        } else if ( status.isFinalized ) {
            const statusStr =`Transaction is finalized in block hash ${status.asFinalized.toHex()}`;
            showExtrinsicStatus(statusStr, txnStatusCallback);
            events.forEach(
                ({event}) => {
                    if (event.method === 'ExtrinsicSuccess') {
                        showExtrinsicStatus('Transaction succeeded', txnStatusCallback);
                    } else if (event.method === 'ExtrinsicFailed') {
                        showExtrinsicStatus('Transaction failed. See chain explorer for details.', txnStatusCallback);
                    }
                }
            );
            return;
        } else if (status.isInBlock) {
            showExtrinsicStatus(`Transaction is included in blockHash ${status.asInBlock.toHex()}`, txnStatusCallback);
        } else {
            if (!!status) {
                showExtrinsicStatus(status.toHuman(), txnStatusCallback)
            }
        }
    } catch(e) {
        showExtrinsicStatus("Error: " + e.toString(), txnStatusCallback)
    }
}

// use the Polkadot extension the user selected to submit the provided extrinsic
async function submitExtrinsicWithExtension(extension: InjectedExtension,
                                            extrinsic: SubmittableExtrinsic,
                                            signingAccount: InjectedAccountWithMeta,
                                            txnStatusCallback: TxnStatusCallback ): Promise<void> {
    let currentTxDone = false;
    try {
        txnStatusCallback("Submitting transaction")
        await extrinsic.signAndSend(signingAccount.address, {signer: extension.signer, nonce: -1},
            (result) => parseChainEvent(result, txnStatusCallback));
        await waitFor(() => currentTxDone);
    } catch {
        const message = `Timeout reached or transaction was invalid.`
        showExtrinsicStatus(message, txnStatusCallback);
    }
}

// Use the built-in test accounts to submit an extrinsic
async function submitExtrinsicWithKeyring(
        extrinsic: SubmittableExtrinsic,
        signingAccount: KeyringPair,
        txnStatusCallback: TxnStatusCallback): Promise<void> {
    try {
        txnStatusCallback("Submitting transaction")
        await extrinsic.signAndSend(signingAccount, {nonce: -1},
        (result) => parseChainEvent(result, txnStatusCallback) );
    } catch(e: any) {
        showExtrinsicStatus(`Unexpected problem:  ${e.toString()}`, txnStatusCallback);
    }
}

// Use the user's selected Polkadot extension to sign some data
// converting to Sr25519Signature is very important, otherwise the signature length
// is incorrect - just using signature gives:
// Enum(Sr25519):: Expected input with 64 bytes (512 bits), found 15 bytes
export async function signPayloadWithExtension(injector: InjectedExtension, signingAccount: InjectedAccountWithMeta, payload: any): Promise<string>{
    const signer = injector?.signer;
    const signRaw = signer?.signRaw;
    let signed: SignerResult;
    if (signer && isFunction(signRaw)) {
        // u8aWrapBytes literally just puts <Bytes></Bytes> around the payload.
        const payloadWrappedToU8a = u8aWrapBytes(payload.toU8a());
        const signerPayloadRaw: SignerPayloadRaw = {
            address: signingAccount.address, data: u8aToHex(payloadWrappedToU8a), type: 'bytes'
        }
        try {
            signed = await signRaw(signerPayloadRaw)
            return signed?.signature;
        } catch(e: any) {
            return "ERROR " + e.message;
        }
    }
    return "Unknown error"
}

// Use the built-in Alice..Ferdie accounts to sign some data
// returns a properly formatted signature to submit with an extrinsic
export function signPayloadWithKeyring(signingAccount: KeyringPair, payload: any): string {
    try {
        // u8aWrapBytes literally puts <Bytes></Bytes> around the payload.
        return u8aToHex(signingAccount.sign(u8aWrapBytes(payload.toU8a())));
    } catch (e: any) {
        return "ERROR " + e.message
    }
}
