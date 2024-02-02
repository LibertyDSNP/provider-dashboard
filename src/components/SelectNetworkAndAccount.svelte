<script lang="ts">
  import { onMount } from 'svelte';
  import { allNetworks, type NetworkInfo } from '$lib/stores/networksStore';
  import { getApi, updateConnectionStatus } from '$lib/polkadotApi';
  import { Account, fetchAccountsForNetwork } from '$lib/stores/accountsStore';
  import { user } from '$lib/stores/userStore';
  import type { WsProvider, ApiPromise } from '@polkadot/api';
  import type { web3Enable, web3Accounts } from '@polkadot/extension-dapp';
  import DropDownMenu from '$components/DropDownMenu.svelte';
  import { defaultDotApi } from '$lib/storeTypes';
  import { dotApi } from '$lib/stores';

  export let accountsStore: Map<string, Account>;
  export let accountSelectorTitle: string = 'Select an account';
  export let accountSelectorPlaceholder: string = 'Select an account';
  export let noAccountsFoundErrorMsg: string = 'No accounts found.';

  let wsProvider: WsProvider;

  // Wallet access
  let thisWeb3Enable: typeof web3Enable;
  let thisWeb3Accounts: typeof web3Accounts;

  let selectedAccount: Account;
  let customNetwork: string;

  // Error messages
  let networkErrorMsg: string = '';
  let controlKeysErrorMsg: string = '';

  let thisDotApi = defaultDotApi;
  dotApi.subscribe((api) => (thisDotApi = api));

  // We need to access the user's wallet to get the accounts
  onMount(async () => {
    // This must be in onMount because the extension requires that you have a window to attach to.
    // Since this project is precompiled, there will be no window until onMount
    const polkadotExt = await import('@polkadot/extension-dapp');
    thisWeb3Enable = polkadotExt.web3Enable;
    thisWeb3Accounts = polkadotExt.web3Accounts;
  });

  async function connectAndFetchAccounts(network: NetworkInfo | null): Promise<void> {
    if (network) {
      try {
        networkErrorMsg = '';
        controlKeysErrorMsg = '';
        accountsStore.clear();
        await getApi(network.endpoint?.toString() ?? '', thisDotApi, wsProvider);
        await fetchAccountsForNetwork(network, thisWeb3Enable, thisWeb3Accounts, thisDotApi.api as ApiPromise);
        await updateConnectionStatus(thisDotApi.api as ApiPromise);
      } catch (e) {
        console.log(e);
        networkErrorMsg = `Could not connect to ${
          network.endpoint?.toString() || 'empty value'
        }. Please enter a valid and reachable Websocket URL.`;
        console.error(networkErrorMsg);
      }
      for (const account of accountsStore) {
        console.log(`Found provider: ${account}`);
      }
      if (networkErrorMsg == '' && accountsStore.size == 0) {
        controlKeysErrorMsg = noAccountsFoundErrorMsg;
      }
    }
  }

  function networkChanged() {
    console.log('networkChanged');
    $user.address = '';
    if ($user.network && $user.network.endpoint && isValidURL($user.network.endpoint.toString())) {
      connectAndFetchAccounts($user.network);
    }
    // canConnect = false;
  }

  function accountChanged() {
    console.log('accountChanged');

    $user = selectedAccount;
  }

  function isValidURL(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch (_) {
      return false;
    }
  }

  function customNetworkChanged(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      if (isValidURL(customNetwork)) {
        const url = new URL(customNetwork);
        if ($user?.network) {
          $user.network.endpoint = url;
        }
      }
    }
  }

  function formatNetwork(network: NetworkInfo): string {
    if (network.name === 'CUSTOM') {
      return network.name;
    }
    return `${network?.name ?? ''}: ${network?.endpoint?.toString().replace(/\/$/, '') ?? ''}`;
  }

  function formatAccount(account: Account): string {
    return account.address;
  }
</script>

<div class="flex flex-col gap-4">
  <DropDownMenu
    id="network"
    label="Select a Network"
    bind:selected={$user.network}
    placeholder="Select a network"
    options={$allNetworks}
    onChange={networkChanged}
    formatter={formatNetwork}
  />
  {#if $user.network != null && $user.network.name == 'CUSTOM'}
    <input
      id="other-endpoint-url"
      type="text"
      pattern="^(http:\/\/|https:\/\/|ws:\/\/|wss:\/\/).+"
      placeholder="wss://some.frequency.node"
      bind:value={customNetwork}
      disabled={$user.network.name != 'CUSTOM'}
      class:hidden={$user.network.name != 'CUSTOM'}
      on:keydown={customNetworkChanged}
    />
  {/if}
  <div id="network-error-msg" class="text-sm text-error">{networkErrorMsg}</div>
  <DropDownMenu
    id="controlkeys"
    label={accountSelectorTitle}
    bind:selected={selectedAccount}
    placeholder={accountSelectorPlaceholder}
    options={Array.from(accountsStore.values())}
    onChange={accountChanged}
    formatter={formatAccount}
    disabled={accountsStore.size == 0}
  />
  <div id="controlkey-error-msg" class="text-sm text-error">{controlKeysErrorMsg}</div>
</div>