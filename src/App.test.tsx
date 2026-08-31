import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from './App';

describe('App', () => {
  it('mounts the shell in a jsdom environment', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Cognitive Study Buddy' })).toBeInTheDocument();
  });

  it('states that the shell implements no feature yet, so the placeholder cannot be mistaken for a build', () => {
    render(<App />);

    expect(screen.getByText(/Scaffold only/)).toBeInTheDocument();
  });
});
