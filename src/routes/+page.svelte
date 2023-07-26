<svelte:head>
    <link rel="stylesheet" href="https://unpkg.com/mvp.css@1.12/mvp.css">
    <link rel="stylesheet" href="app.css">
</svelte:head>
<script lang=ts>
    import Connect from "../components/Connect.svelte";
    import Capacity from "../components/Capacity.svelte";
    import Provider from "../components/Provider.svelte";
    import AddControlKey from "../components/AddControlKey.svelte";
    import KeySelection from "../components/KeySelection.svelte";
    import Stake from "../components/Stake.svelte";
    import {
        storeBlockNumber,
        storeConnected,
        storeValidAccounts,
        transactionSigningAddress,
        storeProviderId,
        storeToken
    } from "$lib/stores";

    let token = '';
    let blockNumber: bigint = 0n;
    let connected = false;
    let validAccounts = {};
    let signingAddress = "";
    let providerId = 0;

    storeBlockNumber.subscribe(val => blockNumber = val);
    storeToken.subscribe(val => token = val);
    storeConnected.subscribe((val) => connected = val);
    storeValidAccounts.subscribe((val) =>  validAccounts = val);
    transactionSigningAddress.subscribe(addr => signingAddress = addr);
    storeProviderId.subscribe(id => providerId = id);

    const onChangeTxnSigningAddress = (evt: Event) => {
        let option = evt.target as HTMLOptionElement;
        transactionSigningAddress.update(addr => addr = option.value);
    }
</script>
<style>
    #status-bar {
        display: flex;
        font-size: smaller;
    }
    .status-item {
        padding-right: 1.5em;
    }
</style>

<h1>Welcome to Provider Dashboard</h1>
<div id="status-bar">
    <div id="connection-status" class="status-item">
        <h3>Connection status: { connected ? "Connected" : "Not connected" }</h3>
        <p>Token: <span id="unit">{token}</span></p>
        <p>Current block number: <span id="current-block">{blockNumber}</span></p>
    </div>
    <div id="provider-status" class="status-item">
        <Provider />
    </div>
    <div id="capacity-status" class="status-item">
        <Capacity bind:token={token} />
    </div>
</div>
<form id="setupForm">
    <Connect />
    <fieldset class={connected ? "" : "hidden"}>
        <KeySelection
                component="TransactionSigningKey"
                selectLabel="2. Choose a Transaction Signing Address"
                selectedOption={""}
                onSelect={onChangeTxnSigningAddress}
                {validAccounts}
            />
    </fieldset>
</form>
<AddControlKey {providerId} {validAccounts}/>
<Stake/>
