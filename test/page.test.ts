import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import '@testing-library/jest-dom';
import Page from '$routes/+page.svelte';

// global.alert = () => {};
// vitest mocking
globalThis.alert = () => {};

const getByTextContent = (text) => {
  // Passing function to `getByText`
  return screen.getByText((content, element) => {
    const hasText = (element) => element.textContent === text;
    const elementHasText = hasText(element);
    const childrenDontHaveText = Array.from(element?.children || []).every((child) => !hasText(child));
    return elementHasText && childrenDontHaveText;
  });
};

describe('End to End Tests', () => {
  beforeAll;
  // TODO: @testing-library/svelte claims to add this automatically but it doesn't work without explicit afterEach
  afterEach(() => cleanup());

  test('check connection status: not connected', async () => {
    render(Page);
    const connectedText = getByTextContent('Connection status: Not connected');
    expect(connectedText).toBeInTheDocument();
  });

  test('connect to localhost', async () => {
    let { container, getByText, getByLabelText } = render(Page);
    let ok = screen.getByText('Ok');
    await fireEvent.click(ok);

    await waitFor(() => {
      let statusBar = container.querySelector('#status-bar');
      expect(statusBar).toBeDefined();
      expect(statusBar).not.toHaveClass('hidden');
    });
    // Get the select box
    const select = getByLabelText('1. Select a Network');

    // Change the select box value
    await fireEvent.select(select, { target: { value: 'Localhost' } });

    // Be sure to wait for all the promises to resolve before checking the result
    await waitFor(() => {
      expect(select).toHaveValue('Localhost');
    });
    expect(getByTextContent('Selected Provider: Localhost')).toBeInTheDocument();

    const btn = getByText('Connect to Localhost');
    await fireEvent.click(btn);

    await waitFor(() => {
      expect(getByTextContent('Connection status: Connected')).toBeInTheDocument();
    });
    const hiddenButton = screen.queryByRole('button', {
      name: 'Connect to Localhost',
    });
    expect(hiddenButton).toBeNull();

    const signer = screen.getByLabelText('2. Choose a Transaction Signing Address');
    await fireEvent.change(signer, {
      target: {
        value: '//Alice: 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
      },
    });
    await waitFor(() => {
      expect(getByTextContent('Selected Key is not associated with a Provider'));
    });
  });
});
