using Grind.Api.Models.Enums;

namespace Grind.Api.Models.Dtos.Settings;

/// <summary>Kapalı bildirim kategorileri (#410); listede olmayan her kategori açıktır.</summary>
public record NotificationCategoriesResponse(IReadOnlyList<NotificationCategory> MutedCategories);

public class UpdateNotificationCategoryRequest
{
    public NotificationCategory Category { get; set; }

    public bool Enabled { get; set; }
}
