<script lang="ts">
  import type { web3Enable, web3FromSource } from '@polkadot/extension-dapp';
  import { dotApi } from '$lib/stores';
  import type { DotApi } from '$lib/storeTypes';
  import { defaultDotApi } from '$lib/storeTypes';
  import type { ApiPromise } from '@polkadot/api';
  import { isLocalhost } from '$lib/utils';
  import { submitCreateMsa } from '$lib/connections';
  import TransactionStatus from '$components/TransactionStatus.svelte';
  import { isFunction } from '@polkadot/util';
  import { onMount } from 'svelte';

  let localDotApi: DotApi = defaultDotApi;
  let thisWeb3FromSource: typeof web3FromSource;
  let thisWeb3Enable: typeof web3Enable;
  let showTransactionStatus = false;
  export let txnStatuses: Array<string> = [];
  export let validAccounts = {};
  export let signingAddress = '';
  // a callback for when the user cancels this action
  export let cancelAction;
  // a callback for when a transaction hits a final state
  export let txnFinished = () => {
    console.log('default txnFinished callback');
  };

  onMount(async () => {
    const extension = await import('@polkadot/extension-dapp');
    thisWeb3FromSource = extension.web3FromSource;
    thisWeb3Enable = extension.web3Enable;
  });

  dotApi.subscribe((api: DotApi) => (localDotApi = api));

  const doCreateMsa = async (_evt: Event) => {
    if (!localDotApi) {
      alert('please reconnect to an endpoint');
      return;
    }
    clearTxnStatuses();
    let endpointURI: string = localDotApi.selectedEndpoint || '';
    let signingKeys = validAccounts[signingAddress];
    showTransactionStatus = true;
    const apiPromise = localDotApi.api as ApiPromise;
    if (isLocalhost(endpointURI)) {
      await submitCreateMsa(apiPromise, undefined, endpointURI, signingKeys, addNewTxnStatus, txnFinished);
    } else {
      if (isFunction(thisWeb3FromSource) && isFunction(thisWeb3Enable)) {
        const extensions = await thisWeb3Enable('Frequency parachain provider dashboard: Creating provider');
        if (extensions.length !== 0) {
          const injectedExtension = await thisWeb3FromSource(signingKeys.meta.source);
          await submitCreateMsa(apiPromise, injectedExtension, endpointURI, signingKeys, addNewTxnStatus, txnFinished);
        }
      }
    }
  };

  const addNewTxnStatus = (txnStatus: string) => {
    txnStatuses = [...txnStatuses, txnStatus];
    return;
  };
  const clearTxnStatuses = () => (txnStatuses = new Array<string>());
</script>

<div id="create-msa" class="action-card basis-1/2">
  <p>
    An MSA (Message Source Account) is required to become a provider.
    This action will create an MSA Id
    that is controlled by the selected Transaction Signing Address above. It is
    available only on Frequency Testnet.
  </p>
  <form class="flex w-350 justify-between">
    <button id="create-msa-btn" on:click|preventDefault={doCreateMsa}
            class="btn-primary action-btn-l">
      Create an MSA
    </button>
    <button on:click|preventDefault={cancelAction} class="btn-cancel action-btn-r">Cancel</button>
  </form>
</div>
<TransactionStatus bind:showSelf={showTransactionStatus} statuses={txnStatuses} />
