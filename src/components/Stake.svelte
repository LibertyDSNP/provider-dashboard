<script lang="ts">
  import { dotApi, storeToken } from '$lib/stores';
  import type { ApiPromise } from '@polkadot/api';
  import { DOLLARS, submitStake, type TxnFinishedCallback } from '$lib/connections';
  import { defaultDotApi } from '$lib/storeTypes';
  import { onMount } from 'svelte';
  import { isFunction } from '@polkadot/util';
  import { formatAccount, isLocalhost } from '$lib/utils';
  import TransactionStatus from './TransactionStatus.svelte';
  import type { web3Enable, web3FromSource } from '@polkadot/extension-dapp';
  import DropDownMenu from './DropDownMenu.svelte';
  import Modal from './Modal.svelte';
  import { user } from '$lib/stores/userStore';
  import { providerAccountsStore } from '$lib/stores/accountsStore';
  import BlockSection from './BlockSection.svelte';

  export let isOpen = false;
  export let close = () => {};

  let thisDotApi = defaultDotApi;
  let selectedKey: string = '';
  let thisWeb3FromSource: typeof web3FromSource;
  let thisWeb3Enable: typeof web3Enable;
  let showTransactionStatus = false;
  export let stakeAmount: bigint = 1n;
  let token = '';
  export let txnStatuses: Array<string> = [];

  $: stakeAmountInDollars = BigInt.asUintN(64, stakeAmount) * BigInt.asUintN(64, DOLLARS);

  onMount(async () => {
    const extension = await import('@polkadot/extension-dapp');
    thisWeb3FromSource = extension.web3FromSource;
    thisWeb3Enable = extension.web3Enable;
  });

  export let providerId = 0;
  export let txnFinished: TxnFinishedCallback = (succeeded: boolean) => {};

  dotApi.subscribe((api) => (thisDotApi = api));
  storeToken.subscribe((val) => (token = val));

  const addNewTxnStatus = (txnStatus: string) => {
    txnStatuses = [...txnStatuses, txnStatus];
  };
  const clearTxnStatuses = () => (txnStatuses = new Array<string>());

  const stake = async (evt: Event) => {
    clearTxnStatuses();
    let endpointURI: string = thisDotApi.selectedEndpoint || '';
    if (selectedKey === '') {
      alert('Please choose a key to stake from.');
    } else {
      showTransactionStatus = true;
      if (isLocalhost(endpointURI)) {
        await submitStake(
          thisDotApi.api as ApiPromise,
          undefined,
          $user.signingKey!,
          providerId,
          stakeAmountInDollars,
          endpointURI as string,
          addNewTxnStatus,
          txnFinished
        );
      } else {
        if (isFunction(thisWeb3FromSource) && isFunction(thisWeb3Enable)) {
          const extensions = await thisWeb3Enable('Frequency parachain provider dashboard: Adding Keys');
          if (extensions.length !== 0) {
            const injectedExtension = await thisWeb3FromSource($user.signingKey!.meta.source!);
            await submitStake(
              thisDotApi.api as ApiPromise,
              injectedExtension,
              $user.signingKey!,
              providerId,
              stakeAmountInDollars,
              endpointURI as string,
              addNewTxnStatus,
              txnFinished
            );
          }
        }
      }
    }
  };

  function handleInput(evt: Event) {
    const target = evt.target as HTMLInputElement;
    if (target !== null && target.value === '') {
      stakeAmount = 0n;
    } else if (target !== null && target.value !== null) {
      stakeAmount = BigInt(target.value);
      return;
    }
  }
</script>

<Modal id="stake-to-provider" {isOpen} {close}>
  <BlockSection title="Stake to Provider">
    <form class="column w-[320px]">
      <DropDownMenu
        id="stake-using-key"
        label="Wallet Address"
        selected={$user.address}
        options={Array.from($providerAccountsStore.values())}
        formatter={formatAccount}
        onChange={() => {}}
      />
      <div class="mt-6">
        <label for="stakingInput">Amount in <span class="units">{token}</span></label>
        <div class="input-container mt-2">
          <input type="number" id="stakingInput" value="1" on:input={handleInput} />
        </div>
      </div>
      <div class="flex w-[350px] items-end justify-between">
        <button on:click|preventDefault={stake} class="btn-primary">Stake</button>
        <button class="btn-no-fill" on:click|preventDefault={close}>Cancel</button>
      </div>
    </form>
      <span class="min-w-full border-b border-b-divider" />
      <div>
        <div class="label mb-2">Requirements</div>
        <ol class="ml-3.5 list-decimal text-xs">1. Ensure the control key has a FRQCY balance.</ol>
        <ol class="ml-3.5 list-decimal text-xs">2. Click 'Stake'</ol>
        <ol class="ml-3.5 list-decimal text-xs">3. This will require 1 signature to send the transaction.</ol>
      </div>
    </BlockSection
  >
</Modal>
<TransactionStatus bind:showSelf={showTransactionStatus} statuses={txnStatuses} />

<style>
  #stakingInput::-webkit-inner-spin-button,
  #stakingInput::-webkit-outer-spin-button {
    margin-left: 10px;
  }
</style>
