import { dotApi, storeConnected } from '../../src/lib/stores';
import '@testing-library/jest-dom';
import CreateMsa from '../../src/components/CreateMsa.svelte';

import { fireEvent, render, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';

globalThis.alert = () => {};

describe('CreateMsa component', () => {
  const mockCancelAction = vi.fn();

  beforeAll(() => {
    storeConnected.set(true);
  });
  it('shows text + Cancel button', () => {
    const { getByRole } = render(CreateMsa, { cancelAction: mockCancelAction });
    expect(getByRole('button', { name: 'Create an MSA' })).toBeInTheDocument();
    expect(getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });
  it('clicking Cancel performs the callback', async () => {
    const { getByRole } = render(CreateMsa, { cancelAction: mockCancelAction });

    const cancel = getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancel);
    expect(mockCancelAction).toHaveBeenCalled();
  });
  it('clicking CreateMsa calls the extrinsic', async () => {
    userEvent.setup();
    const { container, getByRole, getByText } = render(CreateMsa, {
      cancelAction: mockCancelAction,
    });

    let extrinsicWasCalled = false;
    const mockReady = vi.fn().mockResolvedValue(true);
    const mockExtrinsic = vi.fn().mockImplementation(() => {
      extrinsicWasCalled = true;
      return { signAndSend: vi.fn() };
    });
    dotApi.update(
      (val) =>
        (val = {
          ...val,
          selectedEndpoint: 'ws://localhost:9944',
          api: {
            tx: { msa: { create: mockExtrinsic } },
            isReady: mockReady,
          },
        })
    );

    const btn = getByRole('button', { name: 'Create an MSA' });
    userEvent.click(btn);
    await waitFor(() => {
      expect(extrinsicWasCalled).toBe(true);
      expect(container.querySelector('#transaction-status')).not.toHaveClass('hidden');
      expect(getByText('Transaction status')).toBeInTheDocument();
      expect(getByText('Submitting transaction')).toBeInTheDocument();
    });
  });
});
