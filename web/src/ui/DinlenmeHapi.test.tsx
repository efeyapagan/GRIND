import { render, screen } from '@testing-library/react';
import DinlenmeHapi from './DinlenmeHapi';

test('dinlenme varsa sureyi m:ss olarak gosterir', () => {
  render(<DinlenmeHapi saniye={90} />);

  expect(screen.getByText('1:30')).toBeInTheDocument();
});

test('dinlenme null ise (oturumun ilk seti) hicbir sey gostermez', () => {
  // "0:00" ya da bos bir hap, ilk setten once dinlenilmis gibi okunurdu.
  const { container } = render(<DinlenmeHapi saniye={null} />);

  expect(container).toBeEmptyDOMElement();
});
