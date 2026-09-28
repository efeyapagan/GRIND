import { render, screen } from '@testing-library/react-native';
import TurEtiketi from './TurEtiketi';

/**
 * #502 (kullanici bildirdi: "geri tusunun orada antrenman ismi yazan kart tam geri tusuna hizali
 * degil"): hap kendini `self-start` ile satirin TEPESINE yapistiriyor, yanindaki geri tusu ise
 * satirin ortasinda duruyordu. Hizayi saran satir belirler; hap kendi dikey hizasini dayatmaz.
 */
test('hap kendini satirin tepesine yapistirmaz', async () => {
  await render(<TurEtiketi>Push Day</TurEtiketi>);

  expect(screen.getByText('Push Day').props.className).not.toContain('self-start');
});
