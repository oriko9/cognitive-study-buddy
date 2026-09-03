import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import type { CycleDeps } from './hooks/use-cycle';
import { CYCLE_LIMIT, CYCLE_WINDOW_MS, STORAGE_KEY, STORAGE_VERSION } from './lib/contracts';
import { makeDeck } from './fixtures/make-pdf';
import generateOk from './fixtures/generate-ok.json';
import evaluateOk from './fixtures/evaluate-ok.json';

const NOW = 1_800_000_000_000;

function deps(overrides: Partial<CycleDeps> = {}): CycleDeps {
  let value: string | null = null;
  return {
    storage: {
      getItem: () => value,
      setItem: (_k, v) => {
        value = v;
      },
    },
    clock: () => NOW,
    ...overrides,
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

async function selectDeck(pages = 2, text: string | null = 'Working memory capacity page') {
  const bytes = await makeDeck({ pages, text });
  const file = new File([bytes], 'deck.pdf', { type: 'application/pdf' });
  const input = screen.getByTestId('deck-input');
  await userEvent.upload(input, file);
}

describe('App — the whole cycle', () => {
  it('shows the remaining allowance on first load', () => {
    render(<App deps={deps()} />);

    expect(screen.getByTestId('remaining')).toHaveTextContent(String(CYCLE_LIMIT));
  });

  it('carries a deck through to a question and then a graded verdict', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ ok: true, data: generateOk }))
      .mockResolvedValueOnce(jsonResponse({ ok: true, data: evaluateOk }));

    render(<App deps={deps({ fetchImpl: fetchImpl as unknown as typeof fetch })} />);
    await selectDeck();

    await waitFor(() => {
      expect(screen.getByTestId('question-prompt')).toBeInTheDocument();
    });
    expect(screen.getByTestId('question-prompt')).toHaveTextContent('chunking');

    await userEvent.type(screen.getByTestId('answer-input'), 'Chunking groups items.');
    await userEvent.click(screen.getByTestId('submit-answer'));

    await waitFor(() => {
      expect(screen.getByTestId('verdict-score')).toBeInTheDocument();
    });
    expect(screen.getByTestId('verdict-score')).toHaveTextContent('40%');
    // D6: the reason is displayed, not merely stored.
    expect(screen.getByTestId('verdict-justification')).toHaveTextContent('chunking');
    // A cycle counts once it completes.
    expect(screen.getByTestId('remaining')).toHaveTextContent(String(CYCLE_LIMIT - 1));
  });
});

describe('App — every failure is a named state', () => {
  it('names a deck with no text layer and never calls the model', async () => {
    const fetchImpl = vi.fn();
    render(<App deps={deps({ fetchImpl: fetchImpl as unknown as typeof fetch })} />);

    await selectDeck(2, null);

    await waitFor(() => {
      expect(screen.getByTestId('failure-notice')).toBeInTheDocument();
    });
    expect(screen.getByRole('alert')).toHaveTextContent('no text in it');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('names a model timeout rather than spinning forever', async () => {
    const fetchImpl = vi.fn(() =>
      Promise.resolve(jsonResponse({ ok: false, error: { kind: 'timeout' } }, 502)),
    );
    render(<App deps={deps({ fetchImpl: fetchImpl as unknown as typeof fetch })} />);

    await selectDeck();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('did not answer in time');
    });
  });

  it('says nothing was invented when the model stays malformed', async () => {
    const fetchImpl = vi.fn(() =>
      Promise.resolve(jsonResponse({ ok: false, error: { kind: 'malformed', detail: 'x' } }, 502)),
    );
    render(<App deps={deps({ fetchImpl: fetchImpl as unknown as typeof fetch })} />);

    await selectDeck();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('could not read');
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Nothing was invented');
  });

  it('reports a misconfigured deployment without blaming the student', async () => {
    const fetchImpl = vi.fn(() =>
      Promise.resolve(jsonResponse({ ok: false, error: { kind: 'server-misconfigured' } }, 500)),
    );
    render(<App deps={deps({ fetchImpl: fetchImpl as unknown as typeof fetch })} />);

    await selectDeck();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('not configured correctly');
    });
  });

  it('renders the daily limit as a named state, never a blank screen — N11', async () => {
    const full = JSON.stringify({
      v: STORAGE_VERSION,
      ts: Array.from({ length: CYCLE_LIMIT }, () => NOW - CYCLE_WINDOW_MS / 2),
    });
    let value: string | null = full;
    const fetchImpl = vi.fn();

    render(
      <App
        deps={{
          storage: {
            getItem: () => value,
            setItem: (_k, v) => {
              value = v;
            },
          },
          clock: () => NOW,
          fetchImpl,
        }}
      />,
    );

    expect(screen.getByTestId('remaining')).toHaveTextContent('0');
    await selectDeck();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Daily limit reached');
    });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(STORAGE_KEY).toContain('v1');
  });
});
