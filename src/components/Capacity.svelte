<script lang="ts">
  import { storeConnected, dotApi, storeBlockNumber, storeChainInfo, storeCurrentAction } from '$lib/stores';
  import { user } from '$lib/stores/userStore';
  import { getBlockNumber } from '$lib/connections';
  import type { ApiPromise } from '@polkadot/api';
  import type { ChainInfo } from '$lib/storeTypes';
  import { getMsaEpochAndCapacityInfo } from '$lib/polkadotApi';
  import { balanceToHuman } from '$lib/utils.js';
  import ListCard from './ListCard.svelte';
  import { ActionForms } from '$lib/storeTypes.js';
  import Stake from './Stake.svelte';
  
  let epochNumber = 0n;

  let apiPromise: ApiPromise | undefined;
  dotApi.subscribe((api) => {
    if (api?.api) {
      apiPromise = api.api;
    }
  });
  let blockNumber = 0n;
  storeBlockNumber.subscribe((val) => (blockNumber = val));

  $: showStakeToProvider = false;

  export let token = '';

  type CapacityDetails = {
    remainingCapacity: bigint;
    totalTokensStaked: bigint;
    totalCapacityIssued: bigint;
    lastReplenishedEpoch: bigint;
  };
  const defaultDetails: CapacityDetails = {
    remainingCapacity: 0n,
    totalCapacityIssued: 0n,
    totalTokensStaked: 0n,
    lastReplenishedEpoch: 0n,
  };

  let capacityDetails: CapacityDetails = defaultDetails;

  user.subscribe(async (val) => {
    if ($storeConnected && apiPromise) {
      blockNumber = await getBlockNumber(apiPromise);
      $storeBlockNumber = blockNumber;
    }
    if ($storeConnected && apiPromise?.query && $user.address) {
      let info = await getMsaEpochAndCapacityInfo(apiPromise, $user.address);

      capacityDetails = { ...defaultDetails, ...info.capacityDetails };
      epochNumber = info.epochNumber;
      storeChainInfo.update((info: ChainInfo) => (info = { ...info, epochNumber }));
    }
  });

  function showStake() {
    storeCurrentAction.update((val) => (val = ActionForms.Stake));
  }

  let capacityList: { label: string; value: string }[] = [];
  let errMsg: string = '';

  $: {
    if (!$storeConnected) {
      errMsg = 'Not connected';
    } else if (!$user.signingKey) {
      errMsg = 'No transaction signing address selected';
    } else if (!$user.msaId) {
      errMsg = 'No MSA ID.  Please create one.';
    } else {
      errMsg = '';
      capacityList = [
        { label: 'Remaining', value: balanceToHuman(capacityDetails?.remainingCapacity, 'CAP') },
        { label: 'Total Issued', value: balanceToHuman(capacityDetails?.totalCapacityIssued, 'CAP') },
        { label: 'Last Replenished', value: `Epoch ${capacityDetails?.lastReplenishedEpoch}` },
        { label: 'Staked Token', value: balanceToHuman(capacityDetails?.totalCapacityIssued, token) },
      ];
    }
  }
</script>

<ListCard title="Capacity" list={capacityList} errorMessage={errMsg}>
  <button on:click|preventDefault={() => (showStakeToProvider = true)} class="btn-primary">Stake to Provider</button>
  <Stake isOpen={showStakeToProvider} close={() => (showStakeToProvider = false)} />
</ListCard>
