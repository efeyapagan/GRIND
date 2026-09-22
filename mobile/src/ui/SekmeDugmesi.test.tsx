import { render, screen } from '@testing-library/react-native';
import SekmeDugmesi from './SekmeDugmesi';

test('yalnizca secili sekme turuncu parilti tasir (issue #243)', async () => {
  await render(
    <>
      <SekmeDugmesi secili>Secili</SekmeDugmesi>
      <SekmeDugmesi secili={false}>Pasif</SekmeDugmesi>
    </>,
  );

  // Parilti dekoratif oldugu icin erisilebilirlik agacindan gizli -- sorgu gizlileri de kapsar.
  const gizliDahil = { includeHiddenElements: true };
  expect(screen.getAllByTestId('parilti', gizliDahil)).toHaveLength(1);
  expect(screen.getByRole('tab', { selected: true })).toContainElement(screen.getByTestId('parilti', gizliDahil));
});
