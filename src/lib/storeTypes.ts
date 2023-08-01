// @ts-ignore
import {ApiPromise, WsProvider} from "@polkadot/api";
// @ts-ignore
import {Keyring} from "@polkadot/api";

export type DotApi = {
    api?: ApiPromise,
    wsProvider?: WsProvider,
    keyring?: Keyring,
    options?: any,
    selectedEndpoint?: string,
}

export const defaultDotApi: DotApi = {
    selectedEndpoint: "",
    options: {},
}
export enum ActionForms  {
    NoForm,
    AddControlKey,
    Stake,
    OtherForm,
}
