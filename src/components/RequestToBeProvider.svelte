<script lang="ts">
    import type { MsaInfo } from "$lib/storeTypes";
    import {storeMsaInfo, transactionSigningAddress, dotApi} from "$lib/stores";
    import {submitRequestToBeProvider} from "$lib/connections";
    import {onMount} from "svelte";
    import {defaultDotApi} from "$lib/storeTypes";
    import type { DotApi} from "$lib/storeTypes";
    import {isFunction} from "@polkadot/util";
    import {isLocalhost, createMailto} from "$lib/utils";
    import {ApiPromise} from "@polkadot/api";

    const providerNameMax = 20;
    let newProviderName = '';
    let msaId = 0;
    let localDotApi: DotApi = defaultDotApi;
    let web3FromSource;
    let web3Enable;
    let showTransactionStatus = false;
    let mailTo = createMailto(
        "hello@frequency.xyz",
        "",
        ""
    )
    export let txnStatuses: Array<string> = [];
    export let validAccounts = {}
    export let signingAddress = '';
    export let cancelAction;

    onMount(async () => {
        const extension = await import('@polkadot/extension-dapp');
        web3FromSource = extension.web3FromSource;
        web3Enable = extension.web3Enable;
    });

    storeMsaInfo.subscribe((info: MsaInfo) => info?.msaId || 0)
    transactionSigningAddress.subscribe(addr => signingAddress = addr)
    dotApi.subscribe((api) => localDotApi = api)

    const doProposeToBeProvider = async (_evt: Event) => {
        console.log("WAT")
        if (newProviderName === '') {
            alert("please enter a Provider Name");
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
                addNewTxnStatus);
        } else {
            if (isFunction(web3FromSource) && isFunction(web3Enable)) {
                const extensions = web3Enable('Frequency parachain provider dashboard: Proposing to be provider');
                if (extensions.length !== 0) {
                    const injectedExtension = await web3FromSource(signingKeys.meta.source);
                    await submitRequestToBeProvider(
                        localDotApi.api as ApiPromise,
                        injectedExtension,
                        endpointURI,
                        signingKeys,
                        newProviderName,
                        addNewTxnStatus
                    );
                } else {
                    console.error("found no extensions")
                    return;
                }

            } else {
                console.error('web3FromSource is function? ', isFunction(web3FromSource));
                console.error('web3Enable is function? ', isFunction(web3Enable));
            }
        }
    }

    const addNewTxnStatus = (txnStatus: string) => {
        txnStatuses = [...txnStatuses, txnStatus];
    };
    const clearTxnStatuses = () => (txnStatuses = new Array<string>());

</script>
<div id='request-to-be-provider'>
    <h2>Request to Be a Provider</h2>
    <h3>What is a Provider?</h3>
    <p>A Provider is an MSA holder on Frequency with special permissions.</p>
    <ol>
        <li>They can pay for transactions with Capacity as well as Frequency token.</li>
        <li>They can be permitted to post certain transactions on another MSA's behalf, also known as delegation.</li>
        <li>An MSA can stake token to generate Capacity, and designate a Provider to receive that Capacity.</li>
    </ol>
    <p>Anyone with an MSA ID on Frequency's Mainnet who wants to become a Provider must follow this process:</p>
    <ol>
        <li>Submit an on-chain transaction to request be become a provider by filling in and submitting the form below.</li>
        <li><a href={mailTo}>Contact the Frequency Council</a> and inform them that you have requested to become a Provider, and provide them with your MSA Id.</li>
    </ol>
    <form>
        <label for="providerNameRtB">Provider name</label>
        <input id="providerNameRtB" placeholder="Short name" maxlength={providerNameMax} bind:value={newProviderName}/>
        <button on:click|preventDefault={doProposeToBeProvider} id="request-2b-provider-btn">Submit Request To Be Provider</button>
        <button on:click|preventDefault={cancelAction}>Cancel</button>
    </form>
</div>