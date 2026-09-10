namespace Grind.Api.Models.Projections;

/// <summary>
/// Oturum başına toplamlar — repository'nin OKUMA MODELİ, DTO DEĞİL: dışarı verilmez, controller
/// görmez. Takvim ve günlük hacim bunu paylaşır; her ikisi de setleri değil oturum toplamlarını
/// okur, böylece belleğe gelen satır sayısı set sayısıyla değil oturum sayısıyla sınırlı kalır.
/// </summary>
public record SessionAggregate(long SessionId, DateTime StartedAt, int SetCount, decimal Volume);
