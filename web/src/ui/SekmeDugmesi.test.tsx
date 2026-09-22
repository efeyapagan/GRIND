import { render, screen } from '@testing-library/react';
import SekmeDugmesi from './SekmeDugmesi';

test('yalnizca secili sekme turuncu parilti tasir (issue #243)', () => {
  render(
    <div role="tablist">
      <SekmeDugmesi secili>Secili</SekmeDugmesi>
      <SekmeDugmesi secili={false}>Pasif</SekmeDugmesi>
    </div>,
  );

  expect(screen.getByRole('tab', { name: 'Secili' }).querySelector('[data-parilti]')).not.toBeNull();
  expect(screen.getByRole('tab', { name: 'Pasif' }).querySelector('[data-parilti]')).toBeNull();
});
