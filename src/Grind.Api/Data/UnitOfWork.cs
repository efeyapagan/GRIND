using Grind.Api.Common.Exceptions;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Grind.Api.Data;

public class UnitOfWork(AppDbContext context) : IUnitOfWork
{
    /// <summary>
    /// Normal yol: her servis kaydetmeden önce kendi uygulama-seviyesi ön-kontrolünü yapar
    /// (örn. <c>AuthService.RegisterAsync</c>'in <c>UsernameExistsAsync</c> kontrolü) ve kendi
    /// spesifik, kullanıcıya gösterilecek mesajıyla <see cref="ConflictException"/> fırlatır.
    /// Buradaki yakalama o kontrolün YERİNE geçmez — check-then-insert doğası gereği iki eşzamanlı
    /// istek arada aynı ön-kontrolü geçebilir (örn. aynı kullanıcı adıyla art arda çift tıklanan
    /// bir Kaydol düğmesi); DB'nin unique index'i bunu 23505 ile yakalar ve biz bunu jenerik bir
    /// 409'a çeviririz ki istek yığın izli 500 yerine beklenen bir çakışma olarak dönsün.
    /// Provider'a özgü bilgi (Npgsql, SqlState) bilerek Data katmanında kalır — CLAUDE.md'nin
    /// katman kuralı persistence detaylarının Service'e sızmamasını ister.
    /// Not: PLAN.md 5.3'te aynı korumaya `Exercise` adı çakışması için de ihtiyaç duyulacak;
    /// bu yüzden bu çeviri her serviste tekrarlanmak yerine burada, tek noktada yaşıyor (DRY).
    /// </summary>
    public async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            return await context.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException
            { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            throw new ConflictException("Bu kayıt zaten mevcut.");
        }
    }
}
