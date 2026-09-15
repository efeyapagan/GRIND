using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Grind.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class GlobalHareketHavuzu : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "Exercises",
                columns: new[] { "Id", "Category", "IsArchived", "Name", "UserId" },
                values: new object[,]
                {
                    { 16L, "Legs", false, "45 Back Focused Extension", null },
                    { 17L, "Legs", false, "45 Dumbbell Back Focused Extension", null },
                    { 18L, "Legs", false, "45 Dumbbell Glute Focused Extension", null },
                    { 19L, "Legs", false, "45 Dumbbell Single Leg Glute Focused Extension", null },
                    { 20L, "Other", false, "Ab Rollout", null },
                    { 21L, "Legs", false, "Air Box Squat", null },
                    { 22L, "Legs", false, "Air Squat", null },
                    { 23L, "Pull", false, "Alternating Dumbbell Curl", null },
                    { 24L, "Push", false, "Banded Push Up", null },
                    { 25L, "Other", false, "Barbell Ab Rollout", null },
                    { 26L, "Legs", false, "Barbell Box Squat", null },
                    { 27L, "Push", false, "Barbell Floor Press", null },
                    { 28L, "Legs", false, "Barbell Front Squat", null },
                    { 29L, "Legs", false, "Barbell Glute Bridge", null },
                    { 30L, "Legs", false, "Barbell Good Morning", null },
                    { 31L, "Legs", false, "Barbell Hip Thrust", null },
                    { 32L, "Other", false, "Barbell Hold", null },
                    { 33L, "Push", false, "Barbell Overhead Press", null },
                    { 34L, "Legs", false, "Barbell Overhead Squat", null },
                    { 35L, "Push", false, "Cable Front Raise", null },
                    { 36L, "Legs", false, "Cable Glute Pullthrough", null },
                    { 37L, "Other", false, "Cable High to Low Chop", null },
                    { 38L, "Legs", false, "Cable Hip Abduction", null },
                    { 39L, "Legs", false, "Cable Hip Adduction", null },
                    { 40L, "Legs", false, "Cable Kickback", null },
                    { 41L, "Push", false, "Cable Lateral Raise", null },
                    { 42L, "Other", false, "Cable Low to High Chop", null },
                    { 43L, "Push", false, "Cable Overhead Extension", null },
                    { 44L, "Other", false, "Cable Pallof Hold", null },
                    { 45L, "Push", false, "Machine Assisted Dips", null },
                    { 46L, "Pull", false, "Machine Assisted Pull Up", null },
                    { 47L, "Legs", false, "Machine Back Extension", null },
                    { 48L, "Legs", false, "Machine Glute Kickback", null },
                    { 49L, "Push", false, "Machine Lateral Raise", null },
                    { 50L, "Push", false, "Machine Overhead Press", null },
                    { 51L, "Pull", false, "Machine Pulldown", null },
                    { 52L, "Legs", false, "Machine Seated Hip Abduction", null },
                    { 53L, "Legs", false, "Machine Seated Hip Adduction", null },
                    { 54L, "Other", false, "Med Ball Rotational Throw", null },
                    { 55L, "Legs", false, "Miniband Hip Abduction", null },
                    { 56L, "Pull", false, "Seated Cable Face Pull", null },
                    { 57L, "Pull", false, "Seated Cable Row", null },
                    { 58L, "Legs", false, "Seated Calf Raise", null },
                    { 59L, "Push", false, "Seated Dumbbell Shoulder Press", null },
                    { 60L, "Legs", false, "Seated Leg Curl", null },
                    { 61L, "Other", false, "Side Plank", null },
                    { 62L, "Other", false, "Side Plank Rotation", null },
                    { 63L, "Push", false, "Single Arm Banded OHP", null },
                    { 64L, "Pull", false, "Single Arm Banded Row", null },
                    { 65L, "Other", false, "Single Arm Barbell Hold", null }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 16L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 17L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 18L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 19L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 20L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 21L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 22L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 23L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 24L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 25L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 26L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 27L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 28L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 29L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 30L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 31L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 32L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 33L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 34L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 35L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 36L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 37L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 38L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 39L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 40L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 41L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 42L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 43L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 44L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 45L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 46L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 47L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 48L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 49L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 50L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 51L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 52L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 53L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 54L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 55L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 56L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 57L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 58L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 59L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 60L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 61L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 62L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 63L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 64L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 65L);
        }
    }
}
