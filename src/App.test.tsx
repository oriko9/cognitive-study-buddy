import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { App } from './App.js';
import type { CycleDeps } from './hooks/use-cycle.js';
import { CYCLE_LIMIT, CYCLE_WINDOW_MS, MAX_BYTES, STORAGE_KEY, STORAGE_VERSION } from './lib/contracts.js';
import { makeDeck } from './fixtures/make-pdf.js';
import generateOk from './fixtures/generate-ok.json' with { type: 'json' };
import evaluateOk from './fixtures/evaluate-ok.json' with { type: 'json' };

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

  it('names a deck that is too large before ever opening it', async () => {
    const fetchImpl = vi.fn();
    render(<App deps={deps({ fetchImpl: fetchImpl as unknown as typeof fetch })} />);

    const oversized = new Uint8Array(MAX_BYTES + 1);
    const file = new File([oversized], 'huge.pdf', { type: 'application/pdf' });
    await userEvent.upload(screen.getByTestId('deck-input'), file);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('too large to read in the browser');
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('names a file that could not be opened as a PDF, rather than a blank screen', async () => {
    const fetchImpl = vi.fn();
    render(<App deps={deps({ fetchImpl: fetchImpl as unknown as typeof fetch })} />);

    const notAPdf = new TextEncoder().encode('this is not a pdf at all');
    const file = new File([notAPdf], 'notes.pdf', { type: 'application/pdf' });
    await userEvent.upload(screen.getByTestId('deck-input'), file);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('could not be opened as a PDF');
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('names a provider refusal — the case that usually means quota is spent', async () => {
    const fetchImpl = vi.fn(() =>
      Promise.resolve(jsonResponse({ ok: false, error: { kind: 'refused', status: 429 } }, 502)),
    );
    render(<App deps={deps({ fetchImpl: fetchImpl as unknown as typeof fetch })} />);

    await selectDeck();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('refused the request');
    });
    expect(screen.getByRole('alert')).toHaveTextContent('daily free-tier quota');
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
