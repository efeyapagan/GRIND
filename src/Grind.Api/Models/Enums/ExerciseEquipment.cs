namespace Grind.Api.Models.Enums;

/// <summary>
/// Bir hareketin hangi ekipmanla yapıldığı (#413). Set girişindeki ağırlık kutusunun "tek taraf mı,
/// toplam mı" sorusunu yanıtlamak için var: <see cref="Dumbbell"/> "Teki", <see cref="Machine"/>
/// "Toplam" ibaresini gösterir, diğerleri ibare göstermez (eşleme istemcide:
/// <c>packages/shared/src/lib/agirlikIbaresi.ts</c>).
///
/// <see cref="Machine"/> plate-loaded ve pin-loaded makinelerin İKİSİNİ de kapsar — ikisi de toplam
/// ağırlıkla kaydedilir, ayırmak veriye bir şey katmazdı. <see cref="Other"/> beş türe girmeyen
/// aparatlar (med ball, lastik bant). "Bilinmiyor" ayrı bir üye DEĞİL, alanın <c>null</c> hâlidir.
/// </summary>
public enum ExerciseEquipment
{
    Barbell,
    Dumbbell,
    Machine,
    Cable,
    Bodyweight,
    Other
}
