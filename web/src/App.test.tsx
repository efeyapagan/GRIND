import { render, screen } from '@testing-library/react';
import App from './App';

test('uygulama basligi gorunur', () => {
  render(<App />);

  expect(screen.getByRole('heading', { name: 'GRIND' })).toBeInTheDocument();
});
