<script lang="ts">
    import {storeConnected, transactionSigningAddress, dotApi, storeProviderId, storeBlockNumber} from "$lib/stores";
    import { u64, Option } from "@polkadot/types";
    import { getEpoch, getBlockNumber } from "$lib/connections";
    import type {ApiPromise} from "@polkadot/api";

    let connected: boolean;
    let localProviderId = 0;
    storeConnected.subscribe((val) => connected = val);
    let apiPromise: ApiPromise | undefined;
    dotApi.subscribe(api => {
        if (api) { apiPromise = api.api }
    });

    type CapacityDetails = { remainingCapacity: bigint, totalTokensStaked: bigint, totalCapacityIssued: bigint, lastReplenishedEpoch: bigint};
    const defaultDetails: CapacityDetails = {
        remainingCapacity: 0n,
        totalCapacityIssued: 0n,
        totalTokensStaked: 0n,
        lastReplenishedEpoch: 0n};

    let capacityDetails: CapacityDetails = defaultDetails;

    let signingAddress = ""
    let epochNumber: bigint = 0n;
    let blockNumber: bigint = 0n;
    storeBlockNumber.subscribe(val => blockNumber = val);

    transactionSigningAddress.subscribe(async (addr) => {
        signingAddress = addr;
        localProviderId = 0;
        capacityDetails = defaultDetails;
        if (connected && apiPromise) {
            blockNumber = await getBlockNumber(apiPromise);
            storeBlockNumber.update(val => val = blockNumber)
        }
        if (connected && apiPromise?.query && !!addr) {
            const received: u64 = (await apiPromise.query.msa.publicKeyToMsaId(addr)).unwrapOrDefault();
            localProviderId = received.toNumber();
            epochNumber = await getEpoch(apiPromise);
            if (localProviderId > 0) {
                const details: Option<any> = (await apiPromise.query.capacity.capacityLedger(localProviderId)).unwrapOrDefault();
                capacityDetails = {
                    remainingCapacity: details.remainingCapacity.toBigInt(),
                    totalTokensStaked: details.totalTokensStaked.toBigInt(),
                    totalCapacityIssued: details.totalCapacityIssued.toBigInt(),
                    lastReplenishedEpoch: details.lastReplenishedEpoch.toBigInt(),
                };
            }
        }
        storeProviderId.update(val => val = localProviderId)
    });
    export let token;
</script>
<style>
    .hidden {
        display: none;
    }
</style>
<div class={ localProviderId > 0 ? "" : "hidden"}>
    <h3>Capacity at Block {blockNumber}, Epoch {epochNumber}</h3>
    <p><strong>Remaining:</strong> {capacityDetails.remainingCapacity}</p>
    <p><strong>Total Issued:</strong> {capacityDetails.totalCapacityIssued}</p>
    <p><strong>Last replenished:</strong> Epoch {capacityDetails.lastReplenishedEpoch}</p>
    <p><strong>Staked Token:</strong> {capacityDetails.totalCapacityIssued} {token}</p>
</div>