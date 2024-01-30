<script lang="ts">
  import { isLoggedIn } from '$lib/stores';
  import { pageContent } from '$lib/stores/pageContentStore';
  import { user } from '$lib/stores/userStore';
  import { providerAccountsStore } from '$lib/stores/accountsStore';
  import BlockSection from '$components/BlockSection.svelte';
  import Button from '$components/Button.svelte';
  import SelectNetworkAndAccount from './SelectNetworkAndAccount.svelte';

  // Control whether or not the connect button is enabled or disabled
  let canConnect: boolean = false;
  $: canConnect =
    $user?.network != null && Array.from($providerAccountsStore.keys()).length > 0 && $user?.address !== '';

  function connect() {
    $isLoggedIn = true;
    pageContent.dashboard();
  }

  function becomeProvider() {
    pageContent.becomeProvider();
  }
</script>

<div id="provider-login" class="content-block flex w-single-block flex-col gap-4">
  <BlockSection title="Provider Login">
    <SelectNetworkAndAccount accountsStore={$providerAccountsStore}></SelectNetworkAndAccount>
    <Button id="connect-button" title="Connect" disabled={!canConnect} action={connect} />
  </BlockSection>

  <BlockSection title="Not a Provider?">
    <div class="text-sm">
      Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem
      aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.
    </div>
    <Button id="request-2b-provider-btn" title="Become a Provider" action={becomeProvider} />
  </BlockSection>

  <div class="mt-24 text-xs">
    To transact on Frequency as a provider you will need frequency utility tokens. On Frequency testnet, you can get
    tokens from the Testnet Faucet. To do that: Get XRQCY tokens for Frequency Testnet (Rococo) and follow the
    instructions using your desired wallet address to get XRQCY tokens. Once that succeeds, verify the tokens have made
    it to your wallet by selecting or re-selecting the address above. You may need to wait a minute. For more
    information, you can also visit the Rococo Accounts page via the Polkadot UI.
  </div>
</div>
