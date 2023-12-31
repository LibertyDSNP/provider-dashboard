import { cleanup, render, waitFor } from '@testing-library/svelte';
import '@testing-library/jest-dom';
import { storeConnected, transactionSigningAddress, dotApi, storeMsaInfo } from '../../src/lib/stores';
import Capacity from '$components/Capacity.svelte';
import { MsaInfo } from '../../src/lib/storeTypes';
import { getByTextContent } from '../helpers';

const mocks = vi.hoisted(() => {
  class TestCodec {
    value: bigint;
    constructor(val: bigint) {
      this.value = val;
    }
    toBigInt(): bigint {
      return this.value;
    }
    toNumber(): number {
      return this.value as number;
    }
    unwrapOrDefault(): TestCodec {
      return this;
    }
  }

  class TestProviderRegistry {
    providerName: string;
    isSome: boolean;
    constructor(val: string) {
      this.providerName = val;
      this.isSome = val !== '';
    }
    unwrap(): TestProviderRegistry {
      return this;
    }
  }

  const epochNumber = new TestCodec(122n);
  const blockData = {
    block: { header: { number: new TestCodec(1021n) } },
  };

  class TestCapacityDetails {
    remainingCapacity: TestCodec;
    totalTokensStaked: TestCodec;
    totalCapacityIssued: TestCodec;
    lastReplenishedEpoch: TestCodec;

    constructor(rc: bigint, tts: bigint, tci: bigint, lre: bigint) {
      this.remainingCapacity = new TestCodec(rc);
      this.totalTokensStaked = new TestCodec(tts);
      this.totalCapacityIssued = new TestCodec(tci);
      this.lastReplenishedEpoch = new TestCodec(lre);
    }

    unwrapOrDefault(): TestCapacityDetails {
      return this;
    }
  }

  // set up capacity details response
  const capacityDetails: TestCapacityDetails = new TestCapacityDetails(501n, 5000n, 1000n, 59n);

  const resolvedCurrentEpochChain = {
    isReady: vi.fn().mockResolvedValue(true),
    query: {
      capacity: {
        currentEpoch: vi.fn().mockResolvedValue(epochNumber),
        capacityLedger: vi.fn().mockResolvedValue(capacityDetails),
      },
      msa: {
        publicKeyToMsaId: vi.fn().mockResolvedValue(new TestCodec(3n)),
        providerToRegistryEntry: vi.fn().mockResolvedValue(new TestProviderRegistry('Bobbay')),
      },
    },
    rpc: { chain: { getBlock: vi.fn().mockResolvedValue(blockData) } },
    tx: { msa: { addPublicKeyToMsa: vi.fn().mockResolvedValue(undefined) } },
  };

  const mockApiPromise = vi.fn();
  mockApiPromise.create = vi.fn().mockResolvedValue(resolvedCurrentEpochChain);

  const mockWeb3FromSource = vi.fn();
  return {
    ApiPromise: mockApiPromise,
    web3FromSource: mockWeb3FromSource,
  };
});

vi.mock('@polkadot/api', async () => {
  return { ApiPromise: mocks.ApiPromise };
});

describe('Capacity.svelte', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storeMsaInfo.set({ isProvider: false, msaId: 0, providerName: '' });
  });
  afterEach(() => cleanup());

  it('mounts', () => {
    const { container } = render(Capacity, { token: 'FLARP' });
    expect(container).toBeInTheDocument();
  });

  describe('if not connected', () => {
    it('says it is not connected', () => {
      const { getByText } = render(Capacity, { token: 'FLARP' });
      expect(getByText('Not connected')).toBeInTheDocument();
    });
  });
  describe('if connected to an endpoint', () => {
    beforeAll(async () => {
      storeConnected.set(true);
    });

    beforeEach(async () => {
      storeMsaInfo.set({ isProvider: false, msaId: 0, providerName: '' });
      transactionSigningAddress.set('');
    });

    it('if address is not selected it says so', () => {
      const { getByText } = render(Capacity, { token: 'FLARP' });
      expect(getByText('No transaction signing address selected')).toBeInTheDocument();
    });

    it('isProvider is false it says you are not a provider', () => {
      transactionSigningAddress.set("doesn't matter");
      const { getByText } = render(Capacity, { token: 'FLARP' });
      expect(getByText('Not a provider')).toBeInTheDocument();
    });

    it('is shown if it isProvider is true', async () => {
      const { container } = render(Capacity, { token: 'FLARP' });
      storeMsaInfo.update((info: MsaInfo) => (info = { ...info, isProvider: true }));
      await waitFor(() => {
        expect(container.querySelector('div div')).not.toHaveClass('hidden');
      });
    });
  });

  describe('integration: transactionSigningAddress.subscribe function', () => {
    beforeAll(async () => {
      storeConnected.set(true);
    });
    // Also this depends on set-in-stone mocks which will return the address as a Provider
    it('Capacity elements are shown when selected transaction address, with MSA and is a Provider', async () => {
      // render component first
      const createdApi = await mocks.ApiPromise.create();
      const { container } = render(Capacity, { token: 'FLARP' });

      // trigger changes as if user clicked Connect and such
      await dotApi.update((val) => (val = { ...val, api: createdApi }));
      transactionSigningAddress.set('0xdeadbeef');
      await waitFor(() => {
        expect(container.querySelector('div div')).not.toHaveClass('hidden');
      });
    });

    it('Shows the expected values for Capacity, block and epoch', async () => {
      // render component first
      const createdApi = await mocks.ApiPromise.create();
      const { container } = render(Capacity, { token: 'FLARP' });

      // trigger changes as if user clicked Connect and such
      await dotApi.update((val) => (val = { ...val, api: createdApi }));
      transactionSigningAddress.set('0xf00bead');
      await waitFor(() => {
        expect(getByTextContent('Remaining: 5.0100 micro CAP')).toBeInTheDocument();
        expect(getByTextContent('Total Issued: 10.0000 micro CAP')).toBeInTheDocument();
        expect(getByTextContent('Last Replenished: Epoch 59')).toBeInTheDocument();
        expect(getByTextContent('Staked Token: 10.0000 micro FLARP')).toBeInTheDocument();
        expect(container.innerHTML.includes('Epoch 59')).toBe(true);
      });
    });
  });
});
