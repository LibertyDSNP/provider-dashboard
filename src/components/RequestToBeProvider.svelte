<script lang="ts">
  import { transactionSigningAddress, dotApi } from '$lib/stores';
  import { submitRequestToBeProvider } from '$lib/connections';
  import { onMount } from 'svelte';
  import type { web3Accounts, web3Enable, web3FromSource } from '@polkadot/extension-dapp';
  import { defaultDotApi } from '$lib/storeTypes';
  import type { DotApi } from '$lib/storeTypes';
  import { isFunction } from '@polkadot/util';
  import { isLocalhost, createMailto } from '$lib/utils';
  import type { ApiPromise } from '@polkadot/api';
  import TransactionStatus from '$components/TransactionStatus.svelte';
  import BlockSection from './BlockSection.svelte';
  import { user } from '$lib/stores/userStore';
  import SelectNetworkAndAccount from './SelectNetworkAndAccount.svelte';
  import { nonProviderAccountsStore } from '$lib/stores/accountsStore';

  let newProviderName = '';
  let localDotApi: DotApi = defaultDotApi;
  let thisWeb3FromSource: typeof web3FromSource;
  let thisWeb3Enable: typeof web3Enable;
  let thisWeb3Accounts: typeof web3Accounts;

  let showTransactionStatus = false;
  let mailTo = createMailto('hello@frequency.xyz', 'Request to be a Provider', '');
  export let txnStatuses: Array<string> = [];
  export let validAccounts = {};
  export let signingAddress = '';
  // a callback for when the user cancels this action
  export let cancelAction = () => {};
  // a callback for when a transaction hits a final state
  export let txnFinished = () => {
    console.log('default txnFinished callback');
  };

  onMount(async () => {
    const extension = await import('@polkadot/extension-dapp');
    thisWeb3FromSource = extension.web3FromSource;
    thisWeb3Enable = extension.web3Enable;
    thisWeb3Accounts = extension.web3Accounts;
  });

  transactionSigningAddress.subscribe((addr) => (signingAddress = addr));
  dotApi.subscribe((api) => (localDotApi = api));

  const doProposeToBeProvider = async (_evt: Event) => {
    if (newProviderName === '') {
      alert('please enter a Provider Name');
      return;
    }
    if (!localDotApi) {
      alert('please reconnect to an endpoint');
      return;
    }
    clearTxnStatuses();
    let endpointURI: string = localDotApi.selectedEndpoint || '';
    let signingKeys = validAccounts[signingAddress];
    showTransactionStatus = true;
    if (isLocalhost(endpointURI)) {
      await submitRequestToBeProvider(
        localDotApi.api as ApiPromise,
        undefined,
        endpointURI,
        signingKeys,
        newProviderName,
        addNewTxnStatus,
        txnFinished
      );
    } else {
      if (isFunction(thisWeb3FromSource) && isFunction(thisWeb3Enable)) {
        const extensions = await thisWeb3Enable('Frequency parachain provider dashboard: Proposing to be provider');
        if (extensions.length !== 0) {
          const injectedExtension = await thisWeb3FromSource(signingKeys.meta.source);
          await submitRequestToBeProvider(
            localDotApi.api as ApiPromise,
            injectedExtension,
            endpointURI,
            signingKeys,
            newProviderName,
            addNewTxnStatus,
            txnFinished
          );
        } else {
          console.error('found no extensions');
          return;
        }
      } else {
        console.error('web3FromSource is function? ', isFunction(thisWeb3FromSource));
        console.error('web3Enable is function? ', isFunction(thisWeb3Enable));
      }
    }
  };

  const addNewTxnStatus = (txnStatus: string) => {
    txnStatuses = [...txnStatuses, txnStatus];
    return;
  };
  const clearTxnStatuses = () => (txnStatuses = new Array<string>());

</script>

<div id="request-to-be-provider" class="action-card basis-1/2">
  <BlockSection title="Become a provider">
    <form class="flex flex-col gap-4 w-[320px]">
      <SelectNetworkAndAccount accountsStore={$nonProviderAccountsStore}></SelectNetworkAndAccount>
      <label for="providerNameRtB" class="label">Provider name</label>
      <input id="providerNameRtB" placeholder="Short name" maxlength="16" bind:value={newProviderName} />
      <div class="w-350 flex justify-between">
        <button on:click|preventDefault={doProposeToBeProvider} id="request-2b-provider-btn" class="btn-primary">Create Provider</button>
        <button on:click|preventDefault={cancelAction} class="btn-no-fill">Cancel</button>
      </div>
    </form>
  </BlockSection>
  <BlockSection title="More Info">
    <div
      style="width: 100%; color: white; font-size: 12px; font-family: Poppins; font-weight: 400; line-height: 18px; word-wrap: break-word"
    >
      For developer and testing convenience, on Testnet, anyone with an MSA who wishes to become a Provider may simply
      submit a createProvider transaction.<br /><br />This action will register the MSA Id that is controlled by the
      selected Transaction Signing Address above. Any control key for the MSA Id can submit the transaction.
    </div>
  </BlockSection>
</div>
<TransactionStatus bind:showSelf={showTransactionStatus} statuses={txnStatuses} />
