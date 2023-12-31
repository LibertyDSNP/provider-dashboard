import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import '@testing-library/jest-dom';
import { storeConnected } from '$lib/stores';
import Connect from '$components/Connect.svelte';

// vitest mocking: TODO: this hides an alert window but doesn't affect the parameters
//                       tested here. It should not be mocked for e2e tests.
globalThis.alert = () => {};

describe('Connect.svelte Unit Tests', () => {
  // TODO: @testing-library/svelte claims to add this automatically but it doesn't work without explicit afterEach
  afterEach(() => cleanup());

  it('Connection component mounts correctly', () => {
    const { container } = render(Connect);
    expect(container).toBeInTheDocument();
  });

  it('selectedProvider changes according to select box', async () => {
    const { getByRole } = render(Connect);
    const select = getByRole('combobox');

    fireEvent.change(select, { target: { value: 'Rococo' } });

    // Be sure to wait for all the promises to resolve before checking the result
    await waitFor(() => {
      expect(select).toHaveValue('Rococo');
      expect(getByRole('button', { name: 'Connect to Rococo' })).toBeInTheDocument();
    });

    fireEvent.change(select, { target: { value: 'Localhost' } });
    await waitFor(() => {
      expect(select).toHaveValue('Localhost');
      expect(getByRole('button', { name: 'Connect to Localhost' })).toBeInTheDocument();
    });

    fireEvent.change(select, { target: { value: 'Other' } });
    await waitFor(() => {
      expect(select).toHaveValue('Other');
      expect(getByRole('button', { name: 'Connect to Other' })).toBeInTheDocument();
    });
  });

  it('Other provider can be entered when Other selected', async () => {
    render(Connect);
    const select = screen.getByRole('combobox');
    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();

    fireEvent.change(select, { target: { value: 'Other' } });
    await waitFor(() => {
      expect(input).toBeEnabled();
    });

    fireEvent.change(input, {
      target: { value: 'wss://testing.some.node' },
    });
    // Check the otherProvider changes
    await waitFor(() => {
      expect(input).toHaveValue('wss://testing.some.node');
    });
  });

  it('Connect button is enabled after changing provider', async () => {
    render(Connect);
    const btn = screen.getByText('Connect to Rococo');
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'Other' } });
    await waitFor(() => {
      expect(btn).toBeEnabled();
    });
  });

  it('Can subscribe to storeConnected', () => {
    storeConnected.set(false);
    render(Connect);

    let storeValue;
    const unsubscribe = storeConnected.subscribe((value) => {
      storeValue = value;
    });

    // Mock change to storeConnected value
    storeConnected.set(true);
    expect(storeValue).toEqual(true);

    storeConnected.set(false);
    expect(storeValue).toEqual(false);
    unsubscribe();

    // Value doesn't change after unsubscribe
    storeConnected.set(true);
    expect(storeValue).toEqual(false);
  });
});

/*
//TODO improvements
    - alternatives to expect with innerHTML
 */
